import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CombatService {
  constructor(private prisma: PrismaService) {}

  async duel(characterId: string, enemyId: string) {
    // 1. Pobierz dane gracza i przeciwnika
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    const enemy = await this.prisma.enemy.findUnique({
      where: { id: enemyId },
    });

    if (!character || !enemy) {
      throw new NotFoundException('Postać lub przeciwnik nie istnieje');
    }

    // 2. Symulacja walki
    let playerHp = character.hp;
    let enemyHp = enemy.hp;
    const combatLog: { attacker: string; target: string; damage: number }[] = [];

    while (playerHp > 0 && enemyHp > 0) {
      // Atak gracza
      const playerDamage = Math.max(1, character.attack - enemy.defense);
      enemyHp -= playerDamage;
      combatLog.push({
        attacker: character.name,
        target: enemy.name,
        damage: playerDamage,
      });

      if (enemyHp <= 0) break;

      // Atak potwora
      const enemyDamage = Math.max(1, enemy.attack - character.defense);
      playerHp -= enemyDamage;
      combatLog.push({
        attacker: enemy.name,
        target: character.name,
        damage: enemyDamage,
      });
    }

    const won = playerHp > 0;

    // 3. Zapisz wynik walki i zaktualizuj postać
    const battleRecord = await this.prisma.battle.create({
      data: {
        characterId,
        enemyId,
        status: won ? 'WON' : 'LOST',
        log: combatLog,
      },
    });

    if (won) {
      await this.prisma.character.update({
        where: { id: characterId },
        data: {
          exp: { increment: enemy.expReward },
          gold: { increment: enemy.goldReward },
        },
      });
    }

    return {
      result: won ? 'Victory!' : 'Defeat',
      battleId: battleRecord.id,
      remainingHp: playerHp,
      rewards: won ? { exp: enemy.expReward, gold: enemy.goldReward } : null,
      log: combatLog,
    };
  }
}