import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { RechercheService } from './recherche.service';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { obtenirLocaleDepuisRequete } from '../../utils/traductions';

@ApiTags('Search')
@Controller('search')
export class RechercheController {
  constructor(private readonly searchService: RechercheService) {}

  @Get()
  @ApiOperation({ summary: 'Recherche facettée de produits' })
  @ApiQuery({ name: 'q', required: false, description: 'Texte de recherche' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Prix min (centimes)' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Prix max (centimes)' })
  @ApiQuery({ name: 'availableOnly', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'featuredOnly', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'onSale', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['price', 'createdAt', 'stock', 'position'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('featuredOnly') featuredOnly?: string,
    @Query('onSale') onSale?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.searchService.searchProducts({
      q: q || undefined,
      categoryId: categoryId || undefined,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      availableOnly: availableOnly === 'true',
      featuredOnly: featuredOnly === 'true',
      onSale: onSale === 'true',
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      locale,
    });
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Suggestions d\'autocomplétion (max 6 résultats)' })
  @ApiQuery({ name: 'q', required: true, description: 'Texte partiel (min 2 caractères)' })
  @ApiQuery({ name: 'limit', required: false })
  suggest(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.searchService.suggestProducts(q || '', limit ? parseInt(limit) : 6, locale);
  }

  @Post('sync')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Synchroniser les produits vers Meilisearch (admin)' })
  sync() {
    return this.searchService.syncProducts();
  }
}
