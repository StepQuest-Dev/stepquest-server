import { Controller, Post, Get, Body, Request, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RaidsService } from './raids.service';

@Controller('raids')
@UseGuards(JwtAuthGuard)
export class RaidsController {
  constructor(private readonly raidsService: RaidsService) {}

  @Post('start')
  async startRaid(@Request() req: any) {
    return this.raidsService.startRaid(req.user.userId);
  }

  @Get('active')
  async getActiveRaids(@Request() req: any) {
    return this.raidsService.getActiveRaids(req.user.userId);
  }

  @Post('repel/:id')
  async repelRaid(@Param('id') id: string, @Request() req: any) {
    return this.raidsService.repelRaid(req.user.userId, id);
  }
}
