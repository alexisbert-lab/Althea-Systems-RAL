import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Mot de passe : min 8 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre
const REGEX_MOT_DE_PASSE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const MESSAGE_MOT_DE_PASSE =
  'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre';

export class InscriptionDto {
  @ApiProperty({ example: 'Jean Dupont' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Motdepasse1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(REGEX_MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  password: string;
}

export class ConnexionDto {
  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  password: string;
}

export class MotDePasseOublieDto {
  @ApiProperty({ example: 'jean@example.com' })
  @IsEmail()
  email: string;
}

export class ReinitialisationMotDePasseDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(REGEX_MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  password: string;
}

export class ChangementMotDePasseDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(REGEX_MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  newPassword: string;
}
