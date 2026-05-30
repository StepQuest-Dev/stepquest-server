import { Controller, Post, Body } from '@nestjs/common';
import { CombatService } from './combat.service';
import { StartCombatDto } from './dto/start-combat.dto';
import { CombatActionDto } from './dto/combat-action.dto';

@Controller('combat')
export class CombatController {
  constructor(private readonly combatService: CombatService) {}

  @Post('start')
  async startCombat(@Body() dto: StartCombatDto) {
    return this.combatService.startCombat(dto.characterId, dto.enemyId);
  }

  @Post('action')
  async processAction(@Body() dto: CombatActionDto) {
    return this.combatService.processAction(dto.sessionId, dto.characterId, dto.action);
  }
}