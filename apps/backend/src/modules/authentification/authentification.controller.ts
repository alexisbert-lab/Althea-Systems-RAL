import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthentificationService } from './authentification.service';
import { InscriptionDto, ConnexionDto, MotDePasseOublieDto, ReinitialisationMotDePasseDto, ChangementMotDePasseDto } from './dto/authentification.dto';
import { UtilisateurCourant } from './decorateurs/authentification.decorateurs';

@ApiTags('Authentification')
@Controller('auth')
export class AuthentificationController {
  constructor(private readonly authentificationService: AuthentificationService) {}

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Créer un nouveau compte' })
  inscription(@Body() dto: InscriptionDto) {
    return this.authentificationService.register(dto);
  }

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter' })
  connexion(@Body() dto: ConnexionDto) {
    return this.authentificationService.login(dto);
  }

  @Get('verify-email')
  @ApiOperation({ summary: "Vérifier l'email via le token" })
  verifierEmail(@Query('token') token: string) {
    return this.authentificationService.verifyEmail(token);
  }

  @Post('resend-verification')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renvoyer le lien de vérification' })
  renvoyerVerification(@Body() dto: MotDePasseOublieDto) {
    return this.authentificationService.resendVerificationEmail(dto.email);
  }

  @Post('forgot-password')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander une réinitialisation de mot de passe' })
  motDePasseOublie(@Body() dto: MotDePasseOublieDto) {
    return this.authentificationService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe' })
  reinitialiserMotDePasse(@Body() dto: ReinitialisationMotDePasseDto) {
    return this.authentificationService.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Changer son mot de passe' })
  changerMotDePasse(
    @UtilisateurCourant() user: { id: string },
    @Body() dto: ChangementMotDePasseDto,
  ) {
    return this.authentificationService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  /* ─── 2FA ─── */

  @Post('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Générer le secret 2FA et le QR code' })
  setup2FA(@UtilisateurCourant() user: { id: string }) {
    return this.authentificationService.setup2FA(user.id);
  }

  @Post('2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier le code et activer le 2FA' })
  verify2FA(
    @UtilisateurCourant() user: { id: string },
    @Body() body: { code: string },
  ) {
    return this.authentificationService.verify2FA(user.id, body.code);
  }

  @Post('2fa/validate')
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider le code 2FA lors du login' })
  validate2FA(@Body() body: { userId: string; code: string }) {
    return this.authentificationService.validate2FALogin(body.userId, body.code);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver le 2FA' })
  disable2FA(
    @UtilisateurCourant() user: { id: string },
    @Body() body: { code: string },
  ) {
    return this.authentificationService.disable2FA(user.id, body.code);
  }
}
