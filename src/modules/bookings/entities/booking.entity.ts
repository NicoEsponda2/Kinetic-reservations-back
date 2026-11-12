import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { CourtEntity } from '../../courts/entities/court.entity.js';
import { UserEntity } from '../../../auth/entities/user.entity.js';
import { PaymentEntity } from '../../payments/entities/payment.entity.js';
import { CommentsEntity } from '../../comments/entities/comment.entity.js';

@Entity({ name: 'bookings' })
@Index('IDX_bookings_usuario_fecha', ['id_usuario', 'fecha'])
@Index('IDX_bookings_pista_fecha', ['id_pista', 'fecha'])
@Index('IDX_bookings_estado', ['estado'])
export class BookingEntity {
  // --- COLUMNAS PRINCIPALES ---

  @PrimaryGeneratedColumn('increment')
  id_reserva: number;

  @Column({ type: 'uuid' })
  id_usuario: string;

  @Column({ type: 'int' })
  id_pista: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time' })
  hora_termino: string;

  @Column({ type: 'varchar', length: 20 })
  estado: string;

  // 2. CORRECCIÓN: Agregamos "| null" para que TypeScript permita pasarle null desde el servicio
  @Column({ type: 'varchar', length: 255, nullable: true })
  comentario: string | null;

  @Column({ type: 'int' })
  precio_cobrado: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  // --- RELACIONES ---

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<UserEntity>;

  @ManyToOne(() => CourtEntity)
  @JoinColumn({ name: 'id_pista' })
  pista: Relation<CourtEntity>;

  @OneToMany(() => PaymentEntity, (pago) => pago.reserva)
  pagos: Relation<PaymentEntity[]>;

  @OneToMany(() => CommentsEntity, (comentario) => comentario.id_reserva)
  comentarios: Relation<CommentsEntity[]>;
}
