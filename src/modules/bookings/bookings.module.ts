import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { PaymentEntity } from '../payments/entities/payment.entity.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([BookingEntity, UserEntity, CourtEntity, PaymentEntity]),
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
