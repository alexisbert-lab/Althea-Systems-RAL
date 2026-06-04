import { IsString, IsOptional, IsInt, IsArray, ValidateNested, Min, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleCommandeDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreerCommandeDto {
  @ApiProperty({ type: [ArticleCommandeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleCommandeDto)
  items: ArticleCommandeDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  billingAddressId?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ModifierStatutCommandeDto {
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED'] })
  @IsString()
  status: string;
}
