import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { UtilisateurCourant, Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Sauvegarder un message de conversation' })
  saveMessage(
    @UtilisateurCourant() user: { id: string },
    @Body() body: { conversationId: string; role: 'user' | 'assistant'; content: string; model?: string },
  ) {
    return this.chatService.saveMessage({ userId: user.id, ...body });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lister les conversations' })
  getConversations(@UtilisateurCourant() user: { id: string }) {
    return this.chatService.getConversations(user.id);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Obtenir une conversation' })
  getConversation(
    @UtilisateurCourant() user: { id: string },
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getConversation(user.id, conversationId);
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Supprimer une conversation' })
  deleteConversation(
    @UtilisateurCourant() user: { id: string },
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.deleteConversation(user.id, conversationId);
  }

  @Get('admin/conversations')
  @UseGuards(RolesGarde)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Admin: lister toutes les conversations chatbot' })
  getAllConversations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getAllConversations(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('admin/conversations/:conversationId')
  @UseGuards(RolesGarde)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Admin: voir le détail d\'une conversation' })
  getConversationAdmin(@Param('conversationId') conversationId: string) {
    return this.chatService.getConversationAdmin(conversationId);
  }
}
