import { Module } from '@nestjs/common';
import { SportService } from './sport.service.js';
import { SportController } from './sport.controller.js';
import { SportEntity, SportImageEntity } from './entities/index.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsScheduleEntity } from '../sports-schedules/entities/sports-schedule.entity.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { CommentsEntity } from '../comments/entities/comment.entity.js';
import { AuthModule } from '../../auth/auth.module.js';
import { CloudinaryModule } from '../../files/cloudinary/cloudinary.module.js';

@Module({
  controllers: [SportController],
  providers: [SportService],
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      SportEntity,
      SportImageEntity,
      SportsScheduleEntity,
      CourtEntity,
      CommentsEntity,
    ]),
    CloudinaryModule,
  ],
  exports: [SportService, TypeOrmModule],
})
export class SportsModule {}
