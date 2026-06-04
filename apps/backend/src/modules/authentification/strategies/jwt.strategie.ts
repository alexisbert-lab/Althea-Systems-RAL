import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthentificationService } from '../authentification.service';

@Injectable()
export class JwtStrategie extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authentificationService: AuthentificationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'althea-secret-key-change-in-production'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.authentificationService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
