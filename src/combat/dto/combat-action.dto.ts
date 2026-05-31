// dto/combat-action.dto.ts
import { IsUUID, IsEnum } from 'class-validator';

export enum CombatActionType {
  ATTACK   = 'ATTACK',
  FLEE     = 'FLEE',
  USE_ITEM = 'USE_ITEM',
}

export class CombatActionDto {
  @IsUUID()    sessionId!: string;
  @IsUUID()    characterId!: string;
  @IsEnum(CombatActionType) action!: CombatActionType;
}