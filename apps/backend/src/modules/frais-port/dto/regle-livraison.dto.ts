import { IsString, IsEnum, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ShippingRuleType } from '@prisma/client';

export class CreerRegleLivraisonDto {
  @ApiProperty({ example: 'Livraison standard' })
  @IsString()
  label: string;

  @ApiProperty({ enum: ShippingRuleType })
  @IsEnum(ShippingRuleType)
  type: ShippingRuleType;

  @ApiPropertyOptional({ example: 499, description: 'Montant en centimes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Seuil minimum en centimes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  minSubtotal?: number;

  @ApiPropertyOptional({ example: 200000, description: 'Seuil maximum en centimes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxSubtotal?: number;

  @ApiPropertyOptional({ example: 'Nous contacter pour un devis' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class ModifierRegleLivraisonDto extends PartialType(CreerRegleLivraisonDto) {}
