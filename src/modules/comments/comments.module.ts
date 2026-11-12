import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { AuthModule } from '../../auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsEntity } from './entities/comment.entity.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService],
  imports: [TypeOrmModule.forFeature([CommentsEntity, BookingEntity]), AuthModule],
  exports: [CommentsService],
})
export class CommentsModule {}
