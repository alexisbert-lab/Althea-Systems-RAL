import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PanierService } from './panier.service';
import { AjouterArticlePanierDto, ModifierArticlePanierDto } from './dto/panier.dto';
import { UtilisateurCourant } from '../authentification/decorateurs/authentification.decorateurs';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class PanierController {
  constructor(private readonly panierService: PanierService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer le panier courant' })
  getCart(@UtilisateurCourant() user: { id: string }) {
    return this.panierService.getOrCreateCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Ajouter un article au panier' })
  addItem(
    @UtilisateurCourant() user: { id: string },
    @Body() dto: AjouterArticlePanierDto,
  ) {
    return this.panierService.addItem(user.id, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Modifier la quantité d\'un article' })
  updateItem(
    @Param('id') id: string,
    @UtilisateurCourant() user: { id: string },
    @Body() dto: ModifierArticlePanierDto,
  ) {
    return this.panierService.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Supprimer un article du panier' })
  removeItem(
    @Param('id') id: string,
    @UtilisateurCourant() user: { id: string },
  ) {
    return this.panierService.removeItem(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Vider le panier' })
  clearCart(@UtilisateurCourant() user: { id: string }) {
    return this.panierService.clearCart(user.id);
  }
}
