import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParametresSiteService } from './parametres-site.service';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';

@ApiTags('Site Settings')
@Controller('site-settings')
export class ParametresSiteController {
  constructor(private readonly siteSettingsService: ParametresSiteService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir tous les paramètres du site (public)' })
  getAll() {
    return this.siteSettingsService.getAll();
  }

  @Get('detailed')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les paramètres avec métadonnées (admin)' })
  getAllDetailed() {
    return this.siteSettingsService.getAllDetailed();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour plusieurs paramètres (admin)' })
  updateMany(@Body() body: { settings: { key: string; value: string }[] }) {
    return this.siteSettingsService.updateMany(body.settings);
  }
}
