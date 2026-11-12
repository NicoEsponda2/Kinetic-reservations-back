import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AuthModule } from '../auth/auth.module.js';

//Entitys
import { BookingEntity } from '../modules/bookings/entities/booking.entity.js';
import { CommentsEntity } from '../modules/comments/entities/comment.entity.js';
import { CourtEntity } from '../modules/courts/entities/court.entity.js';
import { PaymentEntity } from '../modules/payments/entities/payment.entity.js';
import { SportEntity } from '../modules/sports/entities/sport.entity.js';
import { SportsScheduleEntity } from '../modules/sports-schedules/entities/sports-schedule.entity.js';
import { UserEntity } from '../auth/entities/user.entity.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      BookingEntity,
      CourtEntity,
      SportEntity,
      SportsScheduleEntity,
      PaymentEntity,
      UserEntity,
      CommentsEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
