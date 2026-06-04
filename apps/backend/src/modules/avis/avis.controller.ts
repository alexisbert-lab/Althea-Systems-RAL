import {
  Controller, Get, Post, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AvisService } from './avis.service';
import { CreerAvisDto } from './dto/avis.dto';
import { UtilisateurCourant } from '../authentification/decorateurs/authentification.decorateurs';

@ApiTags('Reviews')
@Controller('reviews')
export class AvisController {
  constructor(private readonly reviewsService: AvisService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Avis d\'un produit' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('product/:productId/rating')
  @ApiOperation({ summary: 'Note moyenne d\'un produit' })
  getProductRating(@Param('productId') productId: string) {
    return this.reviewsService.getProductRating(productId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Laisser un avis' })
  create(@UtilisateurCourant() user: { id: string }, @Body() dto: CreerAvisDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un avis' })
  remove(@Param('id') id: string, @UtilisateurCourant() user: { id: string }) {
    return this.reviewsService.remove(id, user.id);
  }
}
