// src/combat/dto/duel.dto.ts
import { IsString, IsUUID } from 'class-validator';

export class DuelDto {
  @IsString()
  @IsUUID()
  characterId!: string;

  @IsString()
  @IsUUID()
  enemyId!: string;
}