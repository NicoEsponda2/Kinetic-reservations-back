import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { SportEntity } from './sport.entity.js';

@Entity({ name: 'sport_images' })
export class SportImageEntity {
  @ApiProperty({
    example: 14,
    description: 'Identificador numérico único de la imagen de galería',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/tenis-galeria-1.jpg',
    description: 'URL pública optimizada de la imagen almacenada en Cloudinary',
  })
  @Column('text')
  url: string;

  @ManyToOne(() => SportEntity, (sport) => sport.imagenes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_deporte' }) // Vincula explícitamente con la columna id_deporte en la BD
  sport: Relation<SportEntity>;
}
