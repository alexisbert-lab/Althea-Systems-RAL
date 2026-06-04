import { Controller, Get, Put, Patch, Delete, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service';
import { EmailService } from '../email/email.service';
import { UtilisateurCourant, Roles } from '../authentification/decorateurs/authentification.decorateurs';
import { RolesGarde } from '../../gardes/roles.garde';
import { IsString, IsOptional, IsEmail, MinLength, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

class ModifierProfilDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

class ChangerMotDePasseDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

class ModifierRoleDto {
  @IsEnum(Role)
  role: Role;
}

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UtilisateursController {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @UseGuards(RolesGarde)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister les utilisateurs (admin)' })
  trouverTous(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.utilisateursService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      status,
    );
  }

  @Get('me')
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  obtenirMoi(@UtilisateurCourant() user: { id: string }) {
    return this.utilisateursService.findById(user.id);
  }

  @Get('stats')
  @UseGuards(RolesGarde)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Statistiques utilisateurs (admin)' })
  obtenirStatistiques() {
    return this.utilisateursService.getStats();
  }

  @Get('confirm-email-change')
  @ApiOperation({ summary: 'Confirmer le changement d\'email via token' })
  async confirmerChangementEmail(@Query('token') token: string) {
    const user = await this.utilisateursService.findByPendingEmailToken(token);
    if (!user) {
      throw new BadRequestException('Lien de confirmation invalide ou expiré.');
    }
    const updated = await this.utilisateursService.confirmEmailChange(user.id);
    return { message: 'Adresse email mise à jour avec succès.', user: updated };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un utilisateur par ID' })
  trouverUn(@Param('id') id: string) {
    return this.utilisateursService.findById(id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Modifier son profil' })
  async modifierMoi(
    @UtilisateurCourant() user: { id: string },
    @Body() dto: ModifierProfilDto,
  ) {
    const currentUser = await this.utilisateursService.findByIdInternal(user.id);

    // If email is changing, don't update directly — send confirmation
    if (dto.email && dto.email !== currentUser.email) {
      const existingWithEmail = await this.utilisateursService.findByEmail(dto.email);
      if (existingWithEmail) {
        throw new BadRequestException('Un compte avec cet email existe déjà.');
      }

      const token = randomBytes(32).toString('hex');
      const exp = new Date(Date.now() + 24 * 3600000); // 24h
      await this.utilisateursService.setPendingEmail(user.id, dto.email, token, exp);

      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?confirmEmailToken=${token}`;
      this.emailService.sendEmail(
        dto.email,
        'Confirmez votre nouvelle adresse email — Althea System',
        `<h1>Confirmation de changement d'email</h1>
         <p>Vous avez demandé à changer votre adresse email sur Althea System.</p>
         <p>Cliquez sur le lien ci-dessous pour confirmer votre nouvelle adresse :</p>
         <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#00a8b5;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Confirmer le changement</a>
         <p>Ce lien expire dans 24 heures.</p>`,
      ).catch(() => {});

      // Update name only (not email)
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.avatar) updateData.avatar = dto.avatar;

      const updated = Object.keys(updateData).length > 0
        ? await this.utilisateursService.update(user.id, updateData)
        : await this.utilisateursService.findById(user.id);

      return {
        ...updated,
        pendingEmailChange: true,
        message: 'Un email de confirmation a été envoyé à votre nouvelle adresse.',
      };
    }

    // Normal update (name, avatar only)
    const { email: _email, ...updateData } = dto;
    return this.utilisateursService.update(user.id, updateData);
  }

  @Put('me/password')
  @ApiOperation({ summary: 'Changer son mot de passe' })
  async changerMotDePasse(
    @UtilisateurCourant() user: { id: string },
    @Body() dto: ChangerMotDePasseDto,
  ) {
    const fullUser = await this.utilisateursService.findByIdInternal(user.id);
    const valid = await bcrypt.compare(dto.currentPassword, fullUser.passwordHash);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.utilisateursService.updatePassword(user.id, hash);
    return { message: 'Mot de passe modifié avec succès' };
  }

  @Patch('me/deactivate')
  @ApiOperation({ summary: 'Désactiver son compte' })
  desactiverMoi(@UtilisateurCourant() user: { id: string }) {
    return this.utilisateursService.deactivate(user.id);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Supprimer son compte' })
  supprimerMoi(@UtilisateurCourant() user: { id: string }) {
    return this.utilisateursService.delete(user.id);
  }

  @Put(':id/role')
  @UseGuards(RolesGarde)
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: "Modifier le role d'un utilisateur (admin)" })
  modifierRole(
    @Param('id') id: string,
    @Body() dto: ModifierRoleDto,
  ) {
    return this.utilisateursService.updateRole(id, dto.role);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGarde)
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: 'Désactiver un utilisateur (admin)' })
  desactiverUtilisateur(@Param('id') id: string) {
    return this.utilisateursService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGarde)
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: 'Réactiver un utilisateur (admin)' })
  reactiverUtilisateur(@Param('id') id: string) {
    return this.utilisateursService.reactivate(id);
  }

  @Delete(':id')
  @UseGuards(RolesGarde)
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: 'Supprimer un utilisateur (admin)' })
  supprimerUtilisateur(@Param('id') id: string) {
    return this.utilisateursService.delete(id);
  }
}
