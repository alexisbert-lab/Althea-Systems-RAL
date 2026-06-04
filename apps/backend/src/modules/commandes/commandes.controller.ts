import {
  Controller, Get, Post, Put,
  Body, Param, Query, UseGuards, ForbiddenException,

} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommandesService } from './commandes.service';
import { CreerCommandeDto, ModifierStatutCommandeDto } from './dto/commande.dto';
import { UtilisateurCourant, Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';

@ApiTags('Orders')
@Controller('orders')
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une commande' })
  create(
    @Body() dto: CreerCommandeDto,
    @UtilisateurCourant() user: { id: string },
  ) {
    return this.commandesService.create(dto, user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_ORDERS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister toutes les commandes (admin)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.commandesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes commandes' })
  findMyOrders(
    @UtilisateurCourant() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.commandesService.findByUser(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
      year ? parseInt(year) : undefined,
      status,
      search,
    );
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_ORDERS', 'ACCOUNTANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques commandes (admin)' })
  getStats() {
    return this.commandesService.getStats();
  }

  @Get(':id/confirmation')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmation de commande (propriétaire)' })
  async getConfirmation(
    @Param('id') id: string,
    @UtilisateurCourant() user: { id: string },
  ) {
    const order = await this.commandesService.findOne(id);
    if (order.userId !== user.id) throw new ForbiddenException('Accès refusé.');
    return order;
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'une commande' })
  findOne(@Param('id') id: string) {
    return this.commandesService.findOne(id);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN', 'MANAGER_ORDERS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier le statut d\'une commande (admin)' })
  updateStatus(@Param('id') id: string, @Body() dto: ModifierStatutCommandeDto) {
    return this.commandesService.updateStatus(id, dto);
  }
}
