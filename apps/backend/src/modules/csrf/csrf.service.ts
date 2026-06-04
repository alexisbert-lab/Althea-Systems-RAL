import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CsrfService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('CSRF_SECRET', 'althea-csrf-default-secret-2025');
  }

  generateToken(): string {
    const random = crypto.randomBytes(24).toString('hex');
    const sig = crypto.createHmac('sha256', this.secret).update(random).digest('base64url');
    return `${random}.${sig}`;
  }

  validateToken(token: string): boolean {
    try {
      const dot = token.lastIndexOf('.');
      if (dot < 0) return false;
      const random = token.slice(0, dot);
      const sig = token.slice(dot + 1);
      const expected = crypto.createHmac('sha256', this.secret).update(random).digest('base64url');
      if (sig.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }
}
