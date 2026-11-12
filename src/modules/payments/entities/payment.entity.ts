import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity.js';

@Entity({ name: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('increment')
  id_pago: number;

  @Column({ type: 'int' })
  id_reserva: number;

  /* 
   * Muchos a Uno: Un pago pertenece a una Reserva.
   * Lleva @JoinColumn porque la tabla pagos guarda físicamente el id_reserva.
   */
  @ManyToOne(() => BookingEntity, (reserva) => reserva.pagos)
  @JoinColumn({ name: 'id_reserva' })
  reserva: Relation<BookingEntity>;

  @Column({ type: 'int' })
  monto: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  metodo_pago: string; // Ej: 'WEBPAY', 'TRANSFERENCIA', 'EFECTIVO'

  @Column({ type: 'varchar', length: 20 })
  estado_pago: string; // Ej: 'PAGADO', 'PENDIENTE', 'RECHAZADO'

  @Column({ type: 'varchar', length: 255, nullable: true })
  token_transaccion: string; // Útil para guardar tokens de Transbank/MercadoPago

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}