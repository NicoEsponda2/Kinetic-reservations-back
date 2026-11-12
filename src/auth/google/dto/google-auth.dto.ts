import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Token de ID o token de acceso entregado por Google.', writeOnly: true })
  @IsString({ message: 'El token de Google debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token de Google es obligatorio' })
  token: string;
}

