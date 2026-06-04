import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaiementsService } from './paiements.service';
import { UtilisateurCourant, Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';

@ApiTags('Payments')
@Controller('payments')
export class PaiementsController {
  constructor(private readonly paymentsService: PaiementsService) {}

  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un PaymentIntent pour une commande' })
  createPaymentIntent(
    @UtilisateurCourant() user: { id: string },
    @Body() body: { orderId: string },
  ) {
    return this.paymentsService.createPaymentIntent(body.orderId, user.id);
  }

  @Post('confirm-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmer une commande après paiement Stripe réussi' })
  confirmOrder(
    @UtilisateurCourant() user: { id: string },
    @Body() body: { orderId: string },
  ) {
    return this.paymentsService.confirmOrderAfterPayment(body.orderId, user.id);
  }

  @Post('create-checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une session de paiement Stripe' })
  createCheckout(
    @UtilisateurCourant() user: { id: string },
    @Body() body: { priceId: string },
  ) {
    return this.paymentsService.createCheckoutSession(user.id, body.priceId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook Stripe' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }

  @Post('refund')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_ORDERS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rembourser une commande via Stripe (admin)' })
  refund(@Body() body: { orderId: string }) {
    return this.paymentsService.refundOrder(body.orderId);
  }

  @Post('methods/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un SetupIntent pour ajouter une carte' })
  createSetupIntent(@UtilisateurCourant() user: { id: string }) {
    return this.paymentsService.createSetupIntent(user.id);
  }

  @Get('methods')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les méthodes de paiement sauvegardées' })
  listPaymentMethods(@UtilisateurCourant() user: { id: string }) {
    return this.paymentsService.listPaymentMethods(user.id);
  }

  @Delete('methods/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une méthode de paiement' })
  deletePaymentMethod(
    @UtilisateurCourant() user: { id: string },
    @Param('id') paymentMethodId: string,
  ) {
    return this.paymentsService.deletePaymentMethod(user.id, paymentMethodId);
  }

  @Put('methods/:id/default')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Définir une méthode de paiement par défaut' })
  setDefaultPaymentMethod(
    @UtilisateurCourant() user: { id: string },
    @Param('id') paymentMethodId: string,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(user.id, paymentMethodId);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des paiements' })
  getHistory(@UtilisateurCourant() user: { id: string }) {
    return this.paymentsService.getPaymentHistory(user.id);
  }
}
