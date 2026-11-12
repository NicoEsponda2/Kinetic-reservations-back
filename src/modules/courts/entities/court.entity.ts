import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { SportEntity } from '../../sports/entities/sport.entity.js';

@Entity({ name: 'courts' })
@Index('IDX_courts_active', ['is_active'])
export class CourtEntity {
  @PrimaryGeneratedColumn()
  id_pista: number;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'int' })
  precio_hora: number;

  // Cambiamos el tipo de 'string' a 'SportEntity'
  @ManyToOne(() => SportEntity, (sport) => sport.pistas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_deporte' })
  servicio: Relation<SportEntity>;
}
