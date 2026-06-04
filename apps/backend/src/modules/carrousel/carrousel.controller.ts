import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CarrouselService } from './carrousel.service';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { obtenirLocaleDepuisRequete } from '../../utils/traductions';

@ApiTags('Carousel')
@Controller('carousel-slides')
export class CarrouselController {
  constructor(private readonly carouselService: CarrouselService) {}

  @Get()
  findAll(@Req() req: Request, @Query('active') active?: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.carouselService.findAll(active === 'true', locale);
  }

  @Get(':id')
  findById(@Req() req: Request, @Param('id') id: string) {
    const locale = obtenirLocaleDepuisRequete(req);
    return this.carouselService.findById(id, locale);
  }

  @Get(':id/translations')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  getTranslations(@Param('id') id: string) {
    return this.carouselService.getTranslations(id);
  }

  @Put(':id/translations/:locale')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body()
    body: {
      title: string;
      subtitle?: string;
    },
  ) {
    return this.carouselService.upsertTranslation(id, locale, body);
  }

  @Delete(':id/translations/:locale')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  deleteTranslation(@Param('id') id: string, @Param('locale') locale: string) {
    return this.carouselService.deleteTranslation(id, locale);
  }

  @Post('retranslate-all')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  retranslateAll() {
    return this.carouselService.retranslateAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  create(
    @Body()
    body: {
      title: string;
      subtitle?: string;
      image: string;
      link?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    return this.carouselService.create(body);
  }

  @Put('reorder')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  reorder(@Body() body: { ids: string[] }) {
    return this.carouselService.reorder(body.ids);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      subtitle?: string;
      image?: string;
      link?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    return this.carouselService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.carouselService.delete(id);
  }
}
