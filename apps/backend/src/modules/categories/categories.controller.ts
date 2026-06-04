import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreerCategorieDto, ModifierCategorieDto, UpsertCategorieTraductionDto } from './dto/categorie.dto';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { Request } from 'express';
import { obtenirLocaleDepuisRequete } from '../../utils/traductions';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les catégories' })
  findAll(
    @Req() req: Request,
    @Query('active') active?: string,
    @Query('featured') featured?: string,
  ) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.categoriesService.findAll(active === 'true', featured === 'true', locale);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Arborescence des catégories' })
  getTree(@Req() req: Request) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.categoriesService.findTree(locale);
  }

  @Get(':id/translations')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les traductions d\'une catégorie (admin)' })
  getTranslations(@Param('id') id: string) {
    return this.categoriesService.getTranslations(id);
  }

  @Put(':id/translations/:locale')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer ou mettre à jour une traduction catégorie (admin)' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() dto: UpsertCategorieTraductionDto,
  ) {
    return this.categoriesService.upsertTranslation(id, locale, dto);
  }

  @Delete(':id/translations/:locale')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une traduction catégorie (admin)' })
  deleteTranslation(@Param('id') id: string, @Param('locale') locale: string) {
    return this.categoriesService.deleteTranslation(id, locale);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir une catégorie par ID' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.categoriesService.findOne(id, locale);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obtenir une catégorie par slug' })
  findBySlug(@Req() req: Request, @Param('slug') slug: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.categoriesService.findBySlug(slug, locale);
  }

  @Post('retranslate-all')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retraduire toutes les catégories existantes (admin)' })
  retranslateAll() {
    return this.categoriesService.retranslateAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer une categorie (admin)' })
  create(@Body() dto: CreerCategorieDto) {
    return this.categoriesService.create(dto);
  }

  @Put('reorder')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Réordonner les catégories (admin)' })
  reorder(@Body() body: { ids: string[] }) {
    return this.categoriesService.reorder(body.ids);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une categorie (admin)' })
  update(@Param('id') id: string, @Body() dto: ModifierCategorieDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_PRODUCTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une categorie (admin)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
