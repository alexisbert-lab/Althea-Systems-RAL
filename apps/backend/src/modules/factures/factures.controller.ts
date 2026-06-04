import { Controller, Get, Post, Param, Body, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { FacturesService } from './factures.service';
import { AnnulerFactureDto } from './dto/facture.dto';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';

@ApiTags('Invoices')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGarde)
@ApiBearerAuth()
export class FacturesController {
  constructor(private readonly facturesService: FacturesService) {}

  /* ─── Factures ─── */

  @Get('invoices')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Lister les factures' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.facturesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('invoices/:id')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Détail d\'une facture' })
  findOne(@Param('id') id: string) {
    return this.facturesService.findOne(id);
  }

  @Get('invoices/:id/pdf')
  @Roles('ADMIN', 'ACCOUNTANT', 'USER')
  @ApiOperation({ summary: 'Télécharger la facture en PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.facturesService.findOne(id);
    const pdfBuffer = await this.facturesService.generateInvoicePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post('invoices/:id/send-email')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Renvoyer la facture par email au client' })
  sendByEmail(@Param('id') id: string) {
    return this.facturesService.sendByEmail(id);
  }

  @Post('invoices/:id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Annuler une facture (crée automatiquement un avoir)' })
  cancelInvoice(@Param('id') id: string, @Body() dto: AnnulerFactureDto) {
    return this.facturesService.cancelInvoice(id, dto.reason);
  }

  /* ─── Avoirs ─── */

  @Get('credit-notes')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Lister les avoirs' })
  findAllCreditNotes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.facturesService.findAllCreditNotes(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('credit-notes/:id')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Détail d\'un avoir' })
  findOneCreditNote(@Param('id') id: string) {
    return this.facturesService.findOneCreditNote(id);
  }

  @Get('credit-notes/:id/pdf')
  @Roles('ADMIN', 'ACCOUNTANT', 'USER')
  @ApiOperation({ summary: 'Télécharger l\'avoir en PDF' })
  async downloadCreditNotePdf(@Param('id') id: string, @Res() res: Response) {
    const cn = await this.facturesService.findOneCreditNote(id);
    const pdfBuffer = await this.facturesService.generateCreditNotePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cn.creditNoteNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post('credit-notes/:id/send-email')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Envoyer l\'avoir par email au client' })
  sendCreditNoteByEmail(@Param('id') id: string) {
    return this.facturesService.sendCreditNoteByEmail(id);
  }
}
