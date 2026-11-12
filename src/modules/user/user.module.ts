import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { CommentsEntity } from '../comments/entities/comment.entity.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([BookingEntity, UserEntity, CommentsEntity]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
