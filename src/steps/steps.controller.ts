import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { StepsService } from './steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('steps')
@UseGuards(JwtAuthGuard)
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Post()
  createSteps(@CurrentUser('userId') userId: string, @Body() dto: CreateStepDto) {
    return this.stepsService.saveSteps(userId, dto);
  }

  @Get()
  listSteps(@CurrentUser('userId') userId: string) {
    return this.stepsService.listSteps(userId);
  }

  @Get('latest')
  getLatest(@CurrentUser('userId') userId: string) {
    return this.stepsService.getLatestStep(userId);
  }
}
