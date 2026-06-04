import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImageFile, ImageDocument } from './schemas/image.schema';

@Injectable()
export class ImagesService {
  constructor(
    @InjectModel(ImageFile.name) private imageModel: Model<ImageDocument>,
  ) {}

  async upload(
    file: Express.Multer.File,
    productId?: string,
  ): Promise<{ id: string; url: string }> {
    const created = await this.imageModel.create({
      filename: file.originalname,
      contentType: file.mimetype,
      data: file.buffer,
      productId,
    });
    return { id: String(created._id), url: `/api/images/${created._id}` };
  }

  async findOne(id: string): Promise<ImageDocument> {
    const image = await this.imageModel.findById(id).exec();
    if (!image) throw new NotFoundException('Image non trouvée');
    return image;
  }

  async delete(id: string): Promise<void> {
    await this.imageModel.findByIdAndDelete(id).exec();
  }
}
