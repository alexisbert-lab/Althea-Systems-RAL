import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sgMail = require('@sendgrid/mail');

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: 'resend' | 'sendgrid';

  constructor(private readonly configService: ConfigService) {
    // Resend
    const resendKey = this.configService.get('RESEND_API_KEY', '');
    this.resend = resendKey ? new Resend(resendKey) : (null as unknown as Resend);

    // SendGrid
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY', ''));

    // Provider preference
    this.provider = this.configService.get('EMAIL_PROVIDER', 'resend') as any;
  }

  async sendEmail(to: string, subject: string, html: string) {
    const from = this.configService.get('EMAIL_FROM', 'noreply@althea-system.com');

    if (this.provider === 'sendgrid') {
      return this.sendWithSendGrid(from, to, subject, html);
    }
    return this.sendWithResend(from, to, subject, html);
  }

  private async sendWithResend(from: string, to: string, subject: string, html: string) {
    try {
      const result = await this.resend.emails.send({ from, to: [to], subject, html });
      this.logger.log(`Email sent via Resend to ${to}`);
      return result;
    } catch (error) {
      this.logger.error('Resend error:', error);
      throw error;
    }
  }

  private async sendWithSendGrid(from: string, to: string, subject: string, html: string) {
    try {
      const result = await sgMail.send({ from, to, subject, html });
      this.logger.log(`Email sent via SendGrid to ${to}`);
      return result;
    } catch (error) {
      this.logger.error('SendGrid error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    const html = `
      <h1>Bienvenue sur Althea System, ${name} !</h1>
      <p>Votre compte a été créé avec succès.</p>
      <p>Connectez-vous pour commencer à utiliser la plateforme.</p>
    `;
    return this.sendEmail(email, 'Bienvenue sur Althea System', html);
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`;
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
      <p>Ce lien expire dans 1 heure.</p>
    `;
    return this.sendEmail(email, 'Réinitialisation de mot de passe - Althea', html);
  }

  async sendInvoiceEmail(to: string, documentNumber: string, clientName: string, html: string) {
    const isCredit = documentNumber.startsWith('AV-');
    const subject = isCredit
      ? `Avoir ${documentNumber} — Althea System`
      : `Facture ${documentNumber} — Althea System`;
    return this.sendEmail(to, subject, html);
  }

  async sendOrderConfirmationEmail(
    email: string,
    orderId: string,
    total: number,
    currency: string,
  ) {
    const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dashboard/orders`;
    const formattedTotal = (total / 100).toFixed(2);
    const html = `
      <h1>Confirmation de commande</h1>
      <p>Merci pour votre commande sur Althea System !</p>
      <p>Votre commande <strong>${orderId}</strong> d'un montant de <strong>${formattedTotal} ${currency.toUpperCase()}</strong> a bien été confirmée.</p>
      <p>Vous pouvez suivre l'état de votre commande depuis votre espace client :</p>
      <a href="${dashboardUrl}">Voir mes commandes</a>
      <p>L'équipe Althea System</p>
    `;
    return this.sendEmail(
      email,
      `Confirmation de commande ${orderId} — Althea System`,
      html,
    );
  }
}
