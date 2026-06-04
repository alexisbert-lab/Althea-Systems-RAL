import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ImageDocument = HydratedDocument<ImageFile>;

@Schema({ timestamps: true })
export class ImageFile {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true, type: Buffer })
  data: Buffer;

  @Prop()
  productId?: string;
}

export const ImageSchema = SchemaFactory.createForClass(ImageFile);
