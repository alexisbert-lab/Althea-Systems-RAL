import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdressesService } from './adresses.service';
import { CreerAdresseDto, ModifierAdresseDto } from './dto/adresse.dto';
import { UtilisateurCourant } from '../authentification/decorateurs/authentification.decorateurs';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('addresses')
export class AdressesController {
  constructor(private readonly addressesService: AdressesService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter une adresse' })
  create(@UtilisateurCourant() user: { id: string }, @Body() dto: CreerAdresseDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mes adresses' })
  findAll(@UtilisateurCourant() user: { id: string }) {
    return this.addressesService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une adresse' })
  findOne(@Param('id') id: string, @UtilisateurCourant() user: { id: string }) {
    return this.addressesService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une adresse' })
  update(
    @Param('id') id: string,
    @UtilisateurCourant() user: { id: string },
    @Body() dto: ModifierAdresseDto,
  ) {
    return this.addressesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une adresse' })
  remove(@Param('id') id: string, @UtilisateurCourant() user: { id: string }) {
    return this.addressesService.remove(id, user.id);
  }
}
