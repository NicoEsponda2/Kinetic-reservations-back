import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SportImageEntity } from './index.js';
import { SportsScheduleEntity } from '../../sports-schedules/entities/sports-schedule.entity.js';
import { CourtEntity } from '../../courts/entities/court.entity.js';

@Entity({ name: 'sports' })
export class SportEntity {
  @ApiProperty({
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
    description: 'Identificador único universal (UUID v4) del servicio deportivo',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id_deporte: string;

  @ApiProperty({
    example: 'Tenis',
    description: 'Nombre oficial del servicio deportivo',
    minLength: 3,
    maxLength: 255,
  })
  @Column('text', {})
  nombre: string;

  @ApiProperty({
    example:
      'Canchas profesionales de arcilla y superficie rápida con iluminación LED de alta eficiencia.',
    description:
      'Descripción detallada de las instalaciones y características del deporte (valor único)',
  })
  @Column('text', {
    unique: true,
  })
  descripcion: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/faujurn3xy5ypgdmno6e.jpg',
    description:
      'URL pública en Cloudinary de la imagen de portada principal del deporte',
    nullable: true,
  })
  @Column('text', {
    unique: true,
    nullable: true,
  })
  imagen_principal?: string;

  @ApiProperty({
    example: true,
    description:
      'Indica si el servicio deportivo se encuentra habilitado para reservas públicas',
    default: true,
  })
  @Column('bool', {
    default: true,
  })
  is_active: boolean;

  @ApiPropertyOptional({
    type: () => [SportImageEntity],
    description: 'Galería de imágenes secundarias asociadas al deporte',
  })
  @OneToMany(() => SportImageEntity, (sportImage) => sportImage.sport, {
    cascade: true,
    eager: true, // Esto trae automáticamente todas las imágenes en cualquier consulta
  })
  imagenes?: SportImageEntity[];

  @ApiPropertyOptional({
    description: 'Bloques horarios semanales configurados para el deporte',
    example: [
      {
        id_horario: 1,
        dia_semana: 1,
        hora_inicio: '09:00:00',
        hora_termino: '22:00:00',
        is_active: true,
      },
    ],
  })
  @OneToMany(
    () => SportsScheduleEntity,
    (sportsSchedule) => sportsSchedule.servicio,
    { cascade: true },
  )
  horarios?: SportsScheduleEntity[];

  @ApiPropertyOptional({
    description: 'Canchas o pistas asociadas al servicio deportivo',
    example: [
      {
        id_pista: 1,
        nombre: 'Cancha 1 - Arcilla',
        precio_hora: 15000,
        is_active: true,
      },
    ],
  })
  @OneToMany(() => CourtEntity, (courts) => courts.servicio, {
    cascade: true,
  })
  pistas?: CourtEntity[];
}
