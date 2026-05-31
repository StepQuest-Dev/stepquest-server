import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CombatService } from './combat.service';
import { StartCombatDto } from './dto/start-combat.dto';
import { CombatActionDto } from './dto/combat-action.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('combat')
export class CombatController {
  constructor(private readonly combatService: CombatService) {}

  @Post('start')
  async startCombat(@Body() dto: StartCombatDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.combatService.startCombat(userId, dto.enemyId);
  }

  @Post('action')
  async processAction(@Body() dto: CombatActionDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.combatService.processAction(dto.sessionId, userId, dto.action);
  }

  @Get('history')
  async getCombatHistory(@Request() req: any) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.combatService.getCombatHistory(userId);
  }
}