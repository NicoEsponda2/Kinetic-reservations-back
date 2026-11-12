import { Module } from '@nestjs/common';
import { SeedService } from './seed.service.js';
import { SeedController } from './seed.controller.js';
import { SportsModule } from '../modules/sports/sport.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommentsModule } from '../modules/comments/comments.module.js';
import { BookingsModule } from '../modules/bookings/bookings.module.js';
import { PaymentsModule } from '../modules/payments/payments.module.js';
import { CommentsEntity } from '../modules/comments/entities/comment.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../modules/bookings/entities/booking.entity.js';
import { PaymentEntity } from '../modules/payments/entities/payment.entity.js';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    AuthModule,
    SportsModule,
    TypeOrmModule.forFeature([
      BookingEntity,
      PaymentEntity,
      CommentsEntity, 
    ]),
  ],
})
export class SeedModule {}
