import { Module } from '@nestjs/common';
import { SportsSchedulesService } from './sports-schedules.service.js';
import { SportsSchedulesController } from './sports-schedules.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsScheduleEntity } from './entities/sports-schedule.entity.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  controllers: [SportsSchedulesController],
  providers: [SportsSchedulesService],
  imports: [
    TypeOrmModule.forFeature([SportsScheduleEntity, BookingEntity]),
    AuthModule,
  ],
  exports: [ TypeOrmModule],
})
export class SportsSchedulesModule {}
