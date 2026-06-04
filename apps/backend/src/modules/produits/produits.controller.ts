import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Res, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProduitsService } from './produits.service';
import { CreerProduitDto, ModifierProduitDto, UpsertProduitTraductionDto } from './dto/produit.dto';
import { LigneImportValidee } from './dto/import-produit.dto';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { Role } from '@prisma/client';
import { obtenirLocaleDepuisRequete } from '../../utils/traductions';

@ApiTags('Products')
@Controller('products')
export class ProduitsController {
  constructor(private readonly productsService: ProduitsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les produits (public)' })
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('active') active?: string,
  ) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.productsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      categoryId,
      search,
      active: active === 'false' ? false : active === 'all' ? undefined : true,
      featured: featured === 'true' ? true : undefined,
      sortBy,
      sortOrder,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      locale,
    });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Produits mis en avant' })
  getFeatured(@Req() req: Request, @Query('limit') limit?: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.productsService.getFeatured(limit ? parseInt(limit) : 8, locale);
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Statistiques produits (admin)' })
  getStats() {
    return this.productsService.getStats();
  }

  @Post('import/preview')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Prévisualiser un import CSV/Excel' })
  previewImport(
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /\/(csv|vnd\.openxmlformats|vnd\.ms-excel|octet-stream)/ }),
      ],
    })) file: Express.Multer.File,
  ) {
    return this.productsService.validerImport(file.buffer, file.mimetype);
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Vérifier la disponibilité des produits (panier)' })
  checkAvailability(@Body() body: { items: { productId: string; quantity: number }[] }) {
    return this.productsService.checkAvailability(body.items);
  }

  @Get('export')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Exporter les produits en CSV ou Excel' })
  async exportProducts(
    @Query('format') format: string = 'xlsx',
    @Query('ids') ids?: string,
    @Res() res?: Response,
  ) {
    const idList = ids ? ids.split(',').filter(Boolean) : undefined;
    const fmt = format === 'csv' ? 'csv' : 'xlsx';
    const buffer = await this.productsService.exportProducts(fmt, idList);

    const contentType = fmt === 'csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const ext = fmt === 'csv' ? 'csv' : 'xlsx';

    res!.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="produits-export.${ext}"`,
    });
    res!.end(Buffer.from(buffer as ArrayBuffer));
  }

  @Patch('bulk/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Modifier le statut de plusieurs produits' })
  async bulkUpdateStatus(@Body() body: { ids: string[]; active: boolean }) {
    const count = await this.productsService.bulkUpdateStatus(body.ids, body.active);
    return { updated: count };
  }

  @Patch('bulk/category')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Modifier la catégorie de plusieurs produits' })
  async bulkUpdateCategory(@Body() body: { ids: string[]; categoryId: string }) {
    const count = await this.productsService.bulkUpdateCategory(body.ids, body.categoryId);
    return { updated: count };
  }

  @Delete('bulk')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Supprimer plusieurs produits' })
  async bulkDelete(@Body() body: { ids: string[] }) {
    const count = await this.productsService.bulkDelete(body.ids);
    return { deleted: count };
  }

  @Post('import/confirm')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Confirmer et exécuter un import de produits' })
  confirmImport(@Body() body: { lignes: LigneImportValidee[] }) {
    return this.productsService.executerImport(body.lignes);
  }

  @Get(':id/translations')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Lister les traductions d\'un produit (admin)' })
  getTranslations(@Param('id') id: string) {
    return this.productsService.getTranslations(id);
  }

  @Put(':id/translations/:locale')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Créer ou mettre à jour une traduction produit (admin)' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() dto: UpsertProduitTraductionDto,
  ) {
    return this.productsService.upsertTranslation(id, locale, dto);
  }

  @Delete(':id/translations/:locale')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Supprimer une traduction produit (admin)' })
  deleteTranslation(@Param('id') id: string, @Param('locale') locale: string) {
    return this.productsService.deleteTranslation(id, locale);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail produit' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.productsService.findOneLocalized(id, locale);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Produit par slug' })
  findBySlug(@Req() req: Request, @Param('slug') slug: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.productsService.findBySlug(slug, locale);
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Produits similaires' })
  findSimilar(@Req() req: Request, @Param('id') id: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.productsService.findSimilar(id, 6, locale);
  }

  @Post('retranslate-all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Retraduire tous les produits existants (admin)' })
  retranslateAll() {
    return this.productsService.retranslateAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Creer un produit (admin)' })
  create(@Body() dto: CreerProduitDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Modifier un produit (admin)' })
  update(@Param('id') id: string, @Body() dto: ModifierProduitDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Supprimer un produit (admin)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
