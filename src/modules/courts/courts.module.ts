import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module.js';
import { CourtsController } from './courts.controller.js';
import { CourtsService } from './courts.service.js';
import { SportEntity } from '../sports/entities/index.js';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService],
  imports: [TypeOrmModule.forFeature([SportEntity]), AuthModule],
  exports: [TypeOrmModule],
})
export class CourtsModule {}
