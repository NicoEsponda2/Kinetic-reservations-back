import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportEntity } from '../sports/entities/index.js';


@Injectable()
export class CourtsService {
  constructor(
  
    @InjectRepository(SportEntity)
    private readonly sportRepository: Repository<SportEntity>,

  ) {}

}
