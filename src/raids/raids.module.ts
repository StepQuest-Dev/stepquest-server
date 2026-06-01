import { Module } from '@nestjs/common';
import { RaidsController } from './raids.controller';
import { RaidsService } from './raids.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RaidsController],
  providers: [RaidsService],
  exports: [RaidsService],
})
export class RaidsModule {}
