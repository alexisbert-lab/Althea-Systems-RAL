import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { EnvoyerContactDto, ModifierContactDto } from './dto/contact.dto';
import { UtilisateurCourant, Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { CsrfGuard } from '../csrf/csrf.guard';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Envoyer un message de contact (requiert X-CSRF-Token)' })
  create(
    @Body() dto: EnvoyerContactDto,
    @UtilisateurCourant() user?: { id: string },
  ) {
    return this.contactService.create(dto, user?.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les messages (admin)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
  ) {
    return this.contactService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      unread === 'true',
    );
  }

  @Get('unread-count')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nombre de messages non lus' })
  getUnreadCount() {
    return this.contactService.getUnreadCount();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'un message' })
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer comme lu/résolu' })
  update(@Param('id') id: string, @Body() dto: ModifierContactDto) {
    return this.contactService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un message' })
  remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
