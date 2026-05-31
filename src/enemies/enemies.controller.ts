import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnemiesService } from './enemies.service';

@UseGuards(AuthGuard('jwt'))
@Controller('enemies')
export class EnemiesController {
  constructor(private readonly enemiesService: EnemiesService) {}

  @Get()
  async findAll() {
    return this.enemiesService.findAll();
  }
}