import { Module } from '@nestjs/common';
import { PaymentService } from './payments.service.js';
import { PaymentController } from './payments.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './entities/payment.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService],
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PaymentEntity,
      UserEntity,
      BookingEntity,
      CourtEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
