import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfService } from './csrf.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const token = req.headers['x-csrf-token'];
    if (!token || !this.csrfService.validateToken(token)) {
      throw new ForbiddenException('Token CSRF invalide ou manquant.');
    }
    return true;
  }
}
