import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CommandesService } from '../commandes/commandes.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PaiementsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CommandesService))
    private readonly commandesService: CommandesService,
    private readonly emailService: EmailService,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'),
      { apiVersion: '2025-02-24.acacia' },
    );
  }

  async createPaymentIntent(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande non trouvée.');
    if (order.userId !== userId) throw new ForbiddenException('Accès refusé.');
    if (order.status !== 'PENDING')
      throw new BadRequestException('Cette commande ne peut plus être payée.');

    // Idempotence: reuse existing PaymentIntent if already created
    if (order.stripePaymentId) {
      const existingPi = await this.stripe.paymentIntents.retrieve(
        order.stripePaymentId,
      );
      return { clientSecret: existingPi.client_secret };
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: order.total,
      currency: order.currency,
      metadata: { orderId: order.id, userId },
      automatic_payment_methods: { enabled: true },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentId: paymentIntent.id },
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  async createCheckoutSession(userId: string, priceId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Trouver ou créer le customer Stripe
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    let customerId: string;
    if (subscription) {
      customerId = subscription.stripeCustomerId;
    } else {
      const customer = await this.stripe.customers.create({
        email: user?.email,
        name: user?.name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: customerId,
          status: 'TRIALING',
        },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${this.configService.get('FRONTEND_URL')}/dashboard?payment=success`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/dashboard/payments?payment=canceled`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err);
      throw err;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.log(`Checkout completed for customer: ${session.customer}`);
        await this.prisma.subscription.update({
          where: { stripeCustomerId: session.customer as string },
          data: { status: 'ACTIVE', stripeSubscriptionId: session.subscription as string },
        });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELED' },
        });
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const piOrderId = pi.metadata.orderId;
        if (piOrderId) {
          this.logger.log(`PaymentIntent succeeded for order: ${piOrderId}`);
          const order = await this.prisma.order.findUnique({
            where: { id: piOrderId },
          });
          if (order && order.status === 'PENDING') {
            // Retrieve last 4 digits from the payment method
            let paymentLast4: string | undefined;
            try {
              if (pi.payment_method) {
                const pm = await this.stripe.paymentMethods.retrieve(pi.payment_method as string);
                paymentLast4 = pm.card?.last4;
              }
            } catch { /* non-blocking */ }

            // Save last4 on order
            if (paymentLast4) {
              await (this.prisma.order.update as any)({
                where: { id: piOrderId },
                data: { paymentLast4 },
              });
            }

            // Update order status to CONFIRMED (also triggers invoice creation)
            await this.commandesService.updateStatus(piOrderId, {
              status: 'CONFIRMED',
            });
            // Create Payment record for history
            if (order.userId) {
              await this.prisma.payment.create({
                data: {
                  userId: order.userId,
                  stripePaymentId: pi.id,
                  amount: pi.amount,
                  currency: pi.currency,
                  status: 'succeeded',
                  description: `Commande ${piOrderId}`,
                },
              });

              // Send order confirmation email
              const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
              if (user?.email) {
                this.emailService
                  .sendOrderConfirmationEmail(user.email, piOrderId, order.total, order.currency)
                  .catch((err) => this.logger.error('Failed to send order confirmation email:', err));
              }
            }
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const failedOrderId = pi.metadata.orderId;
        if (failedOrderId) {
          this.logger.warn(`Payment failed for order: ${failedOrderId}`);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const refundedPiId = charge.payment_intent as string;
        if (refundedPiId) {
          const refundedOrder = await this.prisma.order.findFirst({
            where: { stripePaymentId: refundedPiId },
          });
          if (refundedOrder && refundedOrder.status !== 'REFUNDED') {
            this.logger.log(`Charge refunded for order: ${refundedOrder.id}`);
            await this.commandesService.updateStatus(refundedOrder.id, {
              status: 'REFUNDED',
            });
            await this.prisma.payment.updateMany({
              where: { stripePaymentId: refundedPiId },
              data: { status: 'refunded' },
            });
          }
        }
        break;
      }
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  async refundOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { invoice: true },
    });
    if (!order) throw new NotFoundException('Commande non trouvée.');
    if (!order.stripePaymentId) {
      throw new BadRequestException('Aucun paiement Stripe associé à cette commande.');
    }

    const refundableStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (!refundableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Impossible de rembourser une commande avec le statut "${order.status}".`,
      );
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: order.stripePaymentId,
        metadata: { orderId: order.id },
      });

      // Update order status to REFUNDED
      await this.commandesService.updateStatus(orderId, { status: 'REFUNDED' });

      // Update payment record if exists
      await this.prisma.payment.updateMany({
        where: { stripePaymentId: order.stripePaymentId },
        data: { status: 'refunded' },
      });

      this.logger.log(
        `Refund ${refund.id} created for order ${orderId} (amount: ${refund.amount})`,
      );

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      };
    } catch (err: any) {
      this.logger.error(`Stripe refund failed for order ${orderId}:`, err.message);
      throw new BadRequestException(
        err.message || 'Erreur lors du remboursement Stripe.',
      );
    }
  }

  /**
   * Ensure the user has a Stripe Customer linked to their account.
   */
  private async ensureStripeCustomer(userId: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (subscription) return subscription.stripeCustomerId;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const customer = await this.stripe.customers.create({
      email: user?.email,
      name: user?.name || undefined,
      metadata: { userId },
    });

    await this.prisma.subscription.create({
      data: {
        userId,
        stripeCustomerId: customer.id,
        status: 'TRIALING',
      },
    });

    return customer.id;
  }

  /**
   * Create a SetupIntent so the user can save a new card.
   */
  async createSetupIntent(userId: string) {
    const customerId = await this.ensureStripeCustomer(userId);

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { userId },
    });

    return { clientSecret: setupIntent.client_secret };
  }

  /**
   * List all saved payment methods for a user.
   */
  async listPaymentMethods(userId: string) {
    const customerId = await this.ensureStripeCustomer(userId);

    const methods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    const defaultPmId = customer.invoice_settings?.default_payment_method;

    return methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPmId,
    }));
  }

  /**
   * Delete a saved payment method.
   */
  async deletePaymentMethod(userId: string, paymentMethodId: string) {
    // Verify ownership
    const customerId = await this.ensureStripeCustomer(userId);
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      throw new ForbiddenException('Ce moyen de paiement ne vous appartient pas.');
    }

    await this.stripe.paymentMethods.detach(paymentMethodId);
    return { deleted: true };
  }

  /**
   * Set a payment method as default for the customer.
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const customerId = await this.ensureStripeCustomer(userId);
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      throw new ForbiddenException('Ce moyen de paiement ne vous appartient pas.');
    }

    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return { defaultPaymentMethodId: paymentMethodId };
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async confirmOrderAfterPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande non trouvée.');
    if (order.userId !== userId) throw new ForbiddenException('Accès refusé.');
    if (order.status !== 'PENDING') return { confirmed: true };

    // Verify Stripe payment if available
    if (order.stripePaymentId) {
      const pi = await this.stripe.paymentIntents.retrieve(order.stripePaymentId);
      if (pi.status !== 'succeeded') {
        throw new BadRequestException('Le paiement Stripe n\'a pas été confirmé.');
      }
    }

    await this.commandesService.updateStatus(orderId, { status: 'CONFIRMED' });
    return { confirmed: true };
  }
}
