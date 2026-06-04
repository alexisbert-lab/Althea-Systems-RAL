import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnvoyerContactDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  message: string;
}

export class ModifierContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  resolved?: boolean;
}
