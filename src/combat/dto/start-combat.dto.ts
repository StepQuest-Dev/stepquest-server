// dto/start-combat.dto.ts
import { IsUUID } from 'class-validator';

export class StartCombatDto {
  @IsUUID()
  enemyId!: string;
}