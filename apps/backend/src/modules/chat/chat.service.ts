import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessageDocument>,
  ) {}

  async saveMessage(data: {
    userId: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string;
  }) {
    const message = new this.chatModel(data);
    return message.save();
  }

  async getConversation(userId: string, conversationId: string) {
    return this.chatModel
      .find({ userId, conversationId })
      .sort({ createdAt: 1 })
      .limit(100)
      .exec();
  }

  async getConversations(userId: string) {
    const conversations = await this.chatModel.aggregate([
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$content' },
          lastDate: { $first: '$createdAt' },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { lastDate: -1 } },
      { $limit: 50 },
    ]);
    return conversations;
  }

  async deleteConversation(userId: string, conversationId: string) {
    return this.chatModel.deleteMany({ userId, conversationId });
  }

  async getAllConversations(page = 1, limit = 20) {
    const conversations = await this.chatModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          userId: { $first: '$userId' },
          lastMessage: { $first: '$content' },
          lastDate: { $first: '$createdAt' },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { lastDate: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    const totalIds = await this.chatModel.distinct('conversationId');

    return {
      data: conversations,
      meta: { total: totalIds.length, page, limit },
    };
  }

  async getConversationAdmin(conversationId: string) {
    return this.chatModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(200)
      .exec();
  }
}
