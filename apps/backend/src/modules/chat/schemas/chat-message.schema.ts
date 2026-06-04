import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'openai' })
  model: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
