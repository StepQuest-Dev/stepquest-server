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
    return this.combatService.startCombat(req.user.characterId, dto.enemyId);
  }

  @Post('action')
  async processAction(@Body() dto: CombatActionDto, @Request() req: any) {
    return this.combatService.processAction(dto.sessionId, req.user.characterId, dto.action);
  }

  @Get('history')
  async getCombatHistory(@Request() req: any) {
    return this.combatService.getCombatHistory(req.user.characterId);
  }
}