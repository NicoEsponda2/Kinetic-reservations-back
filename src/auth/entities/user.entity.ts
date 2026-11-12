import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from '../../modules/bookings/entities/booking.entity.js';

export enum GeneroUsuario {
  MASCULINO = 'M',
  FEMENINO = 'F',
  OTRO = 'O',
  NO_ESPECIFICA = 'N',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id_usuario: string;

  @Column('varchar', { length: 100 })
  nombre: string;

  @Column('varchar', { length: 150, default: '' })
  apellido: string;

  @Column('varchar', { length: 150, unique: true })
  email: string;

  @Column('varchar', { length: 255, select: false, nullable: true })
  password?: string;

  @Column('text', { array: true, default: ['user'] })
  roles: string[];

  @Column('varchar', { length: 20, nullable: true })
  telefono?: string;

  @Column({
    type: 'enum',
    enum: GeneroUsuario,
    default: GeneroUsuario.NO_ESPECIFICA,
    nullable: true,
  })
  genero?: GeneroUsuario;

  @Column('date', { nullable: true })
  fecha_nacimiento?: Date;

  @Column('text', { nullable: true })
  imagen?: string;

  @Column('bool', { default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relaciones
  @OneToMany(() => BookingEntity, (booking) => booking.usuario)
  reservas: BookingEntity[];

  // Propiedad calculada (útil en el backend)
  /**
   * Construye el nombre completo del usuario.
   *
   * @returns El nombre y apellido unidos, sin espacios sobrantes.
   */
  get nombre_completo(): string {
    return `${this.nombre} ${this.apellido || ''}`.trim();
  }

  /**
   * Normaliza el correo antes de insertar o actualizar la entidad.
   *
   * @returns No retorna un valor; modifica el correo de la entidad cuando existe.
   */
  @BeforeInsert()
  @BeforeUpdate()
  normalizarEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
