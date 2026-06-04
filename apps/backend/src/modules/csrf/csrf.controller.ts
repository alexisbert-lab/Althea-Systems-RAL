import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CsrfService } from './csrf.service';

@ApiTags('CSRF')
@Controller('csrf')
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  @Get('token')
  @ApiOperation({ summary: 'Obtenir un token CSRF pour les formulaires publics' })
  getToken(): { csrfToken: string } {
    return { csrfToken: this.csrfService.generateToken() };
  }
}
