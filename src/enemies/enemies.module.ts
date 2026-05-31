import { Module } from '@nestjs/common';
import { EnemiesController } from './enemies.controller';
import { EnemiesService } from './enemies.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EnemiesController],
  providers: [EnemiesService],
})
export class EnemiesModule {}