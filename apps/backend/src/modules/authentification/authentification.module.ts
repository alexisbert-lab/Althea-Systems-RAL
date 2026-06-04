import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthentificationService } from './authentification.service';
import { AuthentificationController } from './authentification.controller';
import { JwtStrategie } from './strategies/jwt.strategie';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    UtilisateursModule,
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'althea-secret-key-change-in-production'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthentificationController],
  providers: [AuthentificationService, JwtStrategie],
  exports: [AuthentificationService],
})
export class AuthentificationModule {}
