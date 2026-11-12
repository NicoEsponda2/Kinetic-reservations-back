import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeneroUsuario } from '../../../auth/entities/user.entity.js';

export class MobileProfileUserDto {
  @ApiProperty({ format: 'uuid' })
  idUsuario: string;

  @ApiProperty({ example: 'Nicolás' })
  nombre: string;

  @ApiProperty({ example: 'Esponda' })
  apellido: string;

  @ApiProperty({ example: 'usuario@ejemplo.cl', format: 'email' })
  email: string;

  @ApiPropertyOptional({ example: '+56912345678', nullable: true })
  telefono: string | null;

  @ApiPropertyOptional({ enum: GeneroUsuario, nullable: true })
  genero: GeneroUsuario | null;

  @ApiPropertyOptional({ example: '1995-08-24', format: 'date', nullable: true })
  fechaNacimiento: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.webp', nullable: true })
  imagen: string | null;

  @ApiProperty({ type: [String], example: ['user'] })
  roles: string[];

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class MobileProfileDataDto {
  @ApiProperty({ type: MobileProfileUserDto })
  user: MobileProfileUserDto;
}

export class MobileProfileResponseDto {
  @ApiProperty({ example: true })
  ok: true;

  @ApiProperty({ example: 'mobile', enum: ['mobile'] })
  client: 'mobile';

  @ApiPropertyOptional({ example: 'Perfil actualizado correctamente' })
  message?: string;

  @ApiProperty({ type: MobileProfileDataDto })
  data: MobileProfileDataDto;
}
