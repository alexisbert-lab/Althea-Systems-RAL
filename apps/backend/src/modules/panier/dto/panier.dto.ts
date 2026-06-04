import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AjouterArticlePanierDto {
  @ApiProperty({ description: 'ID du produit à ajouter' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Quantité souhaitée', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}

export class ModifierArticlePanierDto {
  @ApiProperty({ description: 'Nouvelle quantité', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
