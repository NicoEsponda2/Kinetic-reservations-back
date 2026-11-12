import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity.js';

@Entity({ name: 'comments' })
@Index('IDX_comments_deporte_active', ['id_deporte', 'is_active'])
export class CommentsEntity {
  @PrimaryGeneratedColumn('increment')
  id_comentario: number;

  @Column({ type: 'uuid' })
  id_deporte: string;

  @Column({ type: 'int' })
  calificacion: number; // Generalmente de 1 a 5

  @Column({ type: 'boolean', default: false })
  is_active: boolean; // TypeORM transforma el boolean a TINYINT(1) automáticamente

  @Column({ type: 'text' })
  comentario: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => BookingEntity, (reserva) => reserva.comentarios)
  @JoinColumn({ name: 'id_reserva' })
  id_reserva: Relation<BookingEntity>;
}
