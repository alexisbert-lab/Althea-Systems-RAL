import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

@Injectable()
export class FacturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /* ─── Numérotation auto ─── */

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    const seq = String(count + 1).padStart(5, '0');
    return `FA-${year}-${seq}`;
  }

  private async generateCreditNoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.creditNote.count();
    const seq = String(count + 1).padStart(5, '0');
    return `AV-${year}-${seq}`;
  }

  /* ─── Création automatique à la confirmation de commande ─── */

  async createForOrder(orderId: string): Promise<void> {
    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return; // déjà créée

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');

    const invoiceNumber = await this.generateInvoiceNumber();

    await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId,
        userId: order.userId ?? undefined,
        guestEmail: order.guestEmail ?? undefined,
        amount: order.total,
        status: 'PAID',
      },
    });
  }

  /* ─── Liste des factures ─── */

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          order: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              items: { include: { product: { select: { name: true } } } },
              address: true,
            },
          },
          creditNote: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /* ─── Détail d'une facture ─── */

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
            address: true,
          },
        },
        creditNote: true,
      },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable.');
    return invoice;
  }

  /* ─── Annulation d'une facture → création automatique d'un avoir ─── */

  async cancelInvoice(id: string, reason = 'Annulation de la facture') {
    const invoice = await this.findOne(id);

    if (invoice.status === 'CANCELED') {
      throw new BadRequestException('La facture est déjà annulée.');
    }
    if (invoice.creditNote) {
      throw new BadRequestException('Un avoir existe déjà pour cette facture.');
    }

    const creditNoteNumber = await this.generateCreditNoteNumber();

    const [updatedInvoice, creditNote] = await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      }),
      this.prisma.creditNote.create({
        data: {
          creditNoteNumber,
          invoiceId: id,
          userId: invoice.userId ?? undefined,
          guestEmail: invoice.guestEmail ?? undefined,
          amount: invoice.amount,
          reason,
        },
      }),
    ]);

    return { invoice: updatedInvoice, creditNote };
  }

  /* ─── Envoi de la facture par email ─── */

  async sendByEmail(id: string) {
    const invoice = await this.findOne(id);

    const clientEmail =
      invoice.order.user?.email ?? invoice.order.guestEmail ?? invoice.guestEmail;
    if (!clientEmail) {
      throw new BadRequestException('Aucune adresse email disponible pour ce client.');
    }

    const clientName = invoice.order.user?.name ?? clientEmail;
    const html = this.buildInvoiceHtml(invoice);

    await this.emailService.sendInvoiceEmail(
      clientEmail,
      invoice.invoiceNumber,
      clientName,
      html,
    );

    return { sent: true, to: clientEmail };
  }

  /* ─── Liste des avoirs ─── */

  async findAllCreditNotes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [creditNotes, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          invoice: {
            include: {
              order: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
          },
        },
      }),
      this.prisma.creditNote.count(),
    ]);

    return {
      data: creditNotes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /* ─── Détail d'un avoir ─── */

  async findOneCreditNote(id: string) {
    const cn = await this.prisma.creditNote.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            order: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                items: { include: { product: true } },
                address: true,
              },
            },
          },
        },
      },
    });
    if (!cn) throw new NotFoundException('Avoir introuvable.');
    return cn;
  }

  /* ─── Envoi d'un avoir par email ─── */

  async sendCreditNoteByEmail(id: string) {
    const cn = await this.findOneCreditNote(id);

    const clientEmail =
      cn.invoice.order.user?.email ?? cn.invoice.order.guestEmail ?? cn.guestEmail;
    if (!clientEmail) {
      throw new BadRequestException('Aucune adresse email disponible pour ce client.');
    }

    const clientName = cn.invoice.order.user?.name ?? clientEmail;
    const html = this.buildCreditNoteHtml(cn);

    await this.emailService.sendInvoiceEmail(
      clientEmail,
      cn.creditNoteNumber,
      clientName,
      html,
    );

    return { sent: true, to: clientEmail };
  }

  /* ─── Génération HTML facture (pour email) ─── */

  buildInvoiceHtml(invoice: any): string {
    const order = invoice.order;
    const orderNum = invoice.invoiceNumber;
    const clientName = order.user?.name ?? order.guestEmail ?? 'Client invité';
    const clientEmail = order.user?.email ?? order.guestEmail ?? '';
    const date = new Date(invoice.issuedAt).toLocaleDateString('fr-FR');

    const itemRows = (order.items ?? [])
      .map((item: any) => {
        const ht = (item.unitPrice / 100).toFixed(2);
        const tva = ((item.unitPrice / 100) * 0.2 * item.quantity).toFixed(2);
        const total = (item.total / 100).toFixed(2);
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.product?.name ?? 'Produit'}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${ht} €</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${tva} €</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${total} €</td>
        </tr>`;
      })
      .join('');

    const addrBlock = order.address
      ? `${order.address.street}, ${order.address.postalCode} ${order.address.city}`
      : 'Adresse non renseignée';

    return `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px">
        <h1 style="color:#003d5c">Althea System — Facture ${orderNum}</h1>
        <p><strong>Client :</strong> ${clientName} (${clientEmail})</p>
        <p><strong>Adresse :</strong> ${addrBlock}</p>
        <p><strong>Date :</strong> ${date}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:24px">
          <thead><tr style="background:#003d5c;color:#fff">
            <th style="padding:8px;text-align:left">Désignation</th>
            <th style="padding:8px">Qté</th>
            <th style="padding:8px;text-align:right">HT</th>
            <th style="padding:8px;text-align:right">TVA</th>
            <th style="padding:8px;text-align:right">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="text-align:right;margin-top:16px">
          <p>Sous-total HT : <strong>${(order.subtotal / 100).toFixed(2)} €</strong></p>
          <p>TVA (20%) : <strong>${(order.tax / 100).toFixed(2)} €</strong></p>
          <p>Livraison : <strong>${order.shippingCost === 0 ? 'Offerte' : (order.shippingCost / 100).toFixed(2) + ' €'}</strong></p>
          <p style="font-size:18px">Total TTC : <strong>${(order.total / 100).toFixed(2)} €</strong></p>
        </div>
        <hr style="margin-top:32px"/>
        <p style="color:#888;font-size:12px">Althea System — SIRET 000 000 000 00000 — contact@althea-system.fr</p>
      </div>`;
  }

  /* ─── Génération PDF facture ─── */

  async generateInvoicePdf(id: string): Promise<Buffer> {
    const invoice = await this.findOne(id);
    const order = invoice.order;
    const clientName = order.user?.name ?? order.guestEmail ?? 'Client invité';
    const clientEmail = order.user?.email ?? order.guestEmail ?? '';
    const date = new Date(invoice.issuedAt).toLocaleDateString('fr-FR');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(22).fillColor('#003d5c').text('Althea System', 50, 50);
      doc.fontSize(10).fillColor('#888').text('SIRET : 000 000 000 00000', 50, 75);

      doc.fontSize(24).fillColor('#1a1a2e').text('FACTURE', 350, 50, { align: 'right' });
      doc.fontSize(12).fillColor('#003d5c').text(invoice.invoiceNumber, 350, 80, { align: 'right' });
      doc.fontSize(10).fillColor('#888').text(`Émise le ${date}`, 350, 98, { align: 'right' });

      // Parties
      const partiesY = 130;
      doc.rect(50, partiesY, 495, 80).fill('#f8fafc');

      doc.fontSize(8).fillColor('#6b7280').text('ÉMETTEUR', 65, partiesY + 12);
      doc.fontSize(11).fillColor('#1a1a2e').text('Althea System', 65, partiesY + 25);
      doc.fontSize(9).fillColor('#333').text('12 rue de la Santé, 75014 Paris', 65, partiesY + 40);
      doc.text('contact@althea-system.fr', 65, partiesY + 53);

      doc.fontSize(8).fillColor('#6b7280').text('CLIENT', 310, partiesY + 12);
      doc.fontSize(11).fillColor('#1a1a2e').text(clientName, 310, partiesY + 25);
      doc.fontSize(9).fillColor('#333').text(clientEmail, 310, partiesY + 40);
      if (order.address) {
        doc.text(`${order.address.street}, ${order.address.postalCode} ${order.address.city}`, 310, partiesY + 53);
      }

      // Table header
      const tableY = 240;
      doc.rect(50, tableY, 495, 25).fill('#003d5c');
      doc.fontSize(9).fillColor('#fff');
      doc.text('Désignation', 60, tableY + 8);
      doc.text('Qté', 300, tableY + 8, { width: 40, align: 'center' });
      doc.text('Prix HT', 350, tableY + 8, { width: 60, align: 'right' });
      doc.text('TVA', 420, tableY + 8, { width: 50, align: 'right' });
      doc.text('Total', 480, tableY + 8, { width: 60, align: 'right' });

      // Table rows
      let y = tableY + 30;
      doc.fillColor('#1a1a2e').fontSize(9);
      for (const item of order.items ?? []) {
        const ht = (item.unitPrice / 100).toFixed(2);
        const tva = ((item.unitPrice / 100) * 0.2 * item.quantity).toFixed(2);
        const total = (item.total / 100).toFixed(2);

        doc.text(item.product?.name ?? 'Produit', 60, y, { width: 230 });
        doc.text(String(item.quantity), 300, y, { width: 40, align: 'center' });
        doc.text(`${ht} €`, 350, y, { width: 60, align: 'right' });
        doc.text(`${tva} €`, 420, y, { width: 50, align: 'right' });
        doc.text(`${total} €`, 480, y, { width: 60, align: 'right' });

        y += 20;
        doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#eee').stroke();
      }

      // Totals
      y += 15;
      const totalsX = 380;
      doc.fontSize(10).fillColor('#6b7280');
      doc.text('Sous-total HT', totalsX, y); doc.fillColor('#1a1a2e').text(`${(order.subtotal / 100).toFixed(2)} €`, 480, y, { width: 60, align: 'right' });
      y += 18;
      doc.fillColor('#6b7280').text('TVA (20%)', totalsX, y); doc.fillColor('#1a1a2e').text(`${(order.tax / 100).toFixed(2)} €`, 480, y, { width: 60, align: 'right' });
      y += 18;
      doc.fillColor('#6b7280').text('Livraison', totalsX, y); doc.fillColor('#1a1a2e').text(order.shippingCost === 0 ? 'Offerte' : `${(order.shippingCost / 100).toFixed(2)} €`, 480, y, { width: 60, align: 'right' });
      y += 5;
      doc.moveTo(totalsX, y + 10).lineTo(545, y + 10).strokeColor('#1a1a2e').lineWidth(2).stroke();
      y += 18;
      doc.fontSize(14).fillColor('#1a1a2e').text('Total TTC', totalsX, y);
      doc.text(`${(order.total / 100).toFixed(2)} €`, 480, y, { width: 60, align: 'right' });

      // Footer
      doc.fontSize(8).fillColor('#9ca3af').text(
        `Althea System — SIRET 000 000 000 00000 — ${invoice.invoiceNumber} — ${date}`,
        50, 750, { align: 'center', width: 495 },
      );

      doc.end();
    });
  }

  /* ─── Génération PDF avoir ─── */

  async generateCreditNotePdf(id: string): Promise<Buffer> {
    const cn = await this.findOneCreditNote(id);
    const date = new Date(cn.issuedAt).toLocaleDateString('fr-FR');
    const clientName = cn.invoice.order.user?.name ?? cn.invoice.order.guestEmail ?? 'Client';
    const clientEmail = cn.invoice.order.user?.email ?? cn.invoice.order.guestEmail ?? '';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).fillColor('#003d5c').text('Althea System', 50, 50);
      doc.fontSize(10).fillColor('#888').text('SIRET : 000 000 000 00000', 50, 75);

      doc.fontSize(24).fillColor('#1a1a2e').text('AVOIR', 350, 50, { align: 'right' });
      doc.fontSize(12).fillColor('#003d5c').text(cn.creditNoteNumber, 350, 80, { align: 'right' });
      doc.fontSize(10).fillColor('#888').text(`Émis le ${date}`, 350, 98, { align: 'right' });

      const y = 140;
      doc.fontSize(11).fillColor('#1a1a2e');
      doc.text(`Client : ${clientName}`, 50, y);
      doc.text(`Email : ${clientEmail}`, 50, y + 18);
      doc.text(`Facture liée : ${cn.invoice.invoiceNumber}`, 50, y + 36);
      doc.text(`Motif : ${cn.reason}`, 50, y + 54);

      doc.rect(50, y + 85, 495, 60).fill('#f0fdf4');
      doc.fontSize(18).fillColor('#166534').text(
        `Montant de l'avoir : −${(cn.amount / 100).toFixed(2)} €`,
        65, y + 105,
      );

      doc.fontSize(8).fillColor('#9ca3af').text(
        `Althea System — SIRET 000 000 000 00000 — ${cn.creditNoteNumber} — ${date}`,
        50, 750, { align: 'center', width: 495 },
      );

      doc.end();
    });
  }

  /* ─── Génération HTML avoir (pour email) ─── */

  buildCreditNoteHtml(cn: any): string {
    const date = new Date(cn.issuedAt).toLocaleDateString('fr-FR');
    const clientName =
      cn.invoice.order.user?.name ?? cn.invoice.order.guestEmail ?? 'Client';
    const clientEmail =
      cn.invoice.order.user?.email ?? cn.invoice.order.guestEmail ?? '';

    return `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px">
        <h1 style="color:#003d5c">Althea System — Avoir ${cn.creditNoteNumber}</h1>
        <p><strong>Client :</strong> ${clientName} (${clientEmail})</p>
        <p><strong>Facture liée :</strong> ${cn.invoice.invoiceNumber}</p>
        <p><strong>Date :</strong> ${date}</p>
        <p><strong>Motif :</strong> ${cn.reason}</p>
        <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px">
          <p style="font-size:20px;color:#166534">
            Montant de l'avoir : <strong>−${(cn.amount / 100).toFixed(2)} €</strong>
          </p>
        </div>
        <hr style="margin-top:32px"/>
        <p style="color:#888;font-size:12px">Althea System — SIRET 000 000 000 00000 — contact@althea-system.fr</p>
      </div>`;
  }
}
