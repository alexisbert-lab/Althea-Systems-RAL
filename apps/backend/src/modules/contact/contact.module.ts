import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CsrfModule } from '../csrf/csrf.module';

@Module({
  imports: [PrismaModule, CsrfModule],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
