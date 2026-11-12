import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { SportEntity } from '../../sports/entities/sport.entity.js';

@Entity('sports-schedules')
@Index('IDX_schedules_dia_active', ['dia_semana', 'is_active'])
export class SportsScheduleEntity {
  @PrimaryGeneratedColumn()
  id_horario: number;

  @Column({ type: 'smallint' })
  dia_semana: number;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time' })
  hora_termino: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // 1. La relación debe apuntar a SportEntity, no a string
  @ManyToOne(() => SportEntity, (sport) => sport.horarios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_deporte' }) // 2. Esto le indica a TypeORM que use la columna id_deporte como FK en la BD
  servicio: Relation<SportEntity>;
}
