import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnnulerFactureDto {
  @ApiPropertyOptional({ description: 'Motif de l\'annulation' })
  @IsString()
  @IsOptional()
  reason?: string;
}
