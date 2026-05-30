import { Controller, Post, Body } from '@nestjs/common';
import { CombatService } from './combat.service';
import { DuelDto } from './dto/duel.dto';

@Controller('combat')
export class CombatController {
  constructor(private readonly combatService: CombatService) {}

  @Post('duel')
  async startDuel(@Body() dto: DuelDto) {
    return this.combatService.duel(dto.characterId, dto.enemyId);
  }
}