import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ImagesService } from './images.service';
import { Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { Role } from '@prisma/client';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader une image produit (admin) — stockée dans MongoDB' })
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('productId') productId?: string,
  ) {
    return this.imagesService.upload(file, productId);
    // Retourne { id, url } — l'url est à stocker dans le champ images[] du produit
  }

  @Get(':id')
  @ApiOperation({ summary: "Servir une image depuis MongoDB" })
  async serve(@Param('id') id: string, @Res() res: Response) {
    const image = await this.imagesService.findOne(id);
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(image.data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGarde)
  @Roles(Role.ADMIN, Role.MANAGER_PRODUCTS)
  @ApiOperation({ summary: 'Supprimer une image (admin)' })
  async delete(@Param('id') id: string) {
    await this.imagesService.delete(id);
    return { success: true };
  }
}
