import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FraisPortService } from './frais-port.service';
import { CreerRegleLivraisonDto, ModifierRegleLivraisonDto } from './dto/regle-livraison.dto';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { Role } from '@prisma/client';

@ApiTags('Shipping')
@Controller('shipping-rules')
export class FraisPortController {
  constructor(private readonly fraisPortService: FraisPortService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les règles de livraison' })
  trouverTous() {
    return this.fraisPortService.trouverTous();
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculer les frais de port pour un sous-total' })
  calculer(@Query('subtotal') subtotal: string) {
    return this.fraisPortService.calculerFraisPort(parseInt(subtotal) || 0);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une règle de livraison' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN)
  trouverParId(@Param('id') id: string) {
    return this.fraisPortService.trouverParId(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une règle de livraison' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN)
  creer(@Body() dto: CreerRegleLivraisonDto) {
    return this.fraisPortService.creer(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une règle de livraison' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN)
  modifier(@Param('id') id: string, @Body() dto: ModifierRegleLivraisonDto) {
    return this.fraisPortService.modifier(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une règle de livraison' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN)
  supprimer(@Param('id') id: string) {
    return this.fraisPortService.supprimer(id);
  }
}
