import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StepsService } from './steps.service';
import { StepsController } from './steps.controller';

@Module({
  imports: [PrismaModule],
  providers: [StepsService],
  controllers: [StepsController],
})
export class StepsModule {}
