import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { CombatActionType } from './dto/combat-action.dto';

interface CombatSessionState {
  characterId: string;
  enemyId: string;
  playerHp: number;
  enemyHp: number;
  turn: number;
  log: { attacker: string; target: string; damage: number; action: string; targetHpAfter?: number }[];
  status: 'ACTIVE' | 'WON' | 'LOST' | 'FLED';

  // Cache danych — żeby nie odpytywać DB co turę
  characterName: string;
  characterAttack: number;
  characterDefense: number;
  characterMaxHp: number;
  characterTotalSteps: number;
  characterUserId: string;
  enemyName: string;
  enemyAttack: number;
  enemyDefense: number;
  enemyExpReward: number;
  enemyGoldReward: number;
  characterClass: string | null;
  characterBonus: string | null;
  characterTurn: number;
}

const SESSION_TTL_SECONDS = 60 * 30; // 30 minut

@Injectable()
export class CombatService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private redis: Redis,
  ) {}

  // ── POMOCNICZE ────────────────────────────────────────────────

  private sessionKey(sessionId: string) {
    return `combat:session:${sessionId}`;
  }

private async getSession(sessionId: string): Promise<CombatSessionState> {
  const raw = await this.redis.get(this.sessionKey(sessionId));
  if (!raw) throw new NotFoundException('Sesja walki nie istnieje lub wygasła');
  return JSON.parse(raw) as CombatSessionState;
}

private async saveSession(sessionId: string, state: CombatSessionState) {
  await this.redis.set(
    this.sessionKey(sessionId),
    JSON.stringify(state),
    'EX',
    SESSION_TTL_SECONDS,
  );
}

  private async deleteSession(sessionId: string) {
    await this.redis.del(this.sessionKey(sessionId));
  }

  // ── START ─────────────────────────────────────────────────────

  async startCombat(characterId: string, enemyId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true },
    });
    const enemy = await this.prisma.enemy.findUnique({
      where: { id: enemyId },
    });

    if (!character || !enemy) {
      throw new NotFoundException('Postać lub przeciwnik nie istnieje');
    }

    // Utwórz rekord sesji w DB (status PENDING)
    const session = await this.prisma.combatSession.create({
      data: { characterId, enemyId, status: 'PENDING' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stepRecord = await this.prisma.stepRecord.findUnique({
      where: { userId: character.userId },
    });

      const stepsToday = stepRecord && stepRecord.recordedAt >= today
    ? stepRecord.count
    : 0;

    const state: CombatSessionState = {
      characterId,
      enemyId,
      playerHp: character.hp,
      enemyHp: enemy.hp,
      turn: 1,
      log: [],
      status: 'ACTIVE',
      characterName: character.name,
      characterAttack: character.attack,
      characterDefense: character.defense,
      characterMaxHp: character.maxHp,
      characterTotalSteps: stepsToday,
      characterUserId: character.userId,
      characterClass: character.class?.name ?? null,
      characterBonus: character.class?.bonus ?? null,
      characterTurn: 0,
      enemyName: enemy.name,
      enemyAttack: enemy.attack,
      enemyDefense: enemy.defense,
      enemyExpReward: enemy.expReward,
      enemyGoldReward: enemy.goldReward,
    };

    await this.saveSession(session.id, state);

    return {
      sessionId: session.id,
      turn: state.turn,
      playerHp: state.playerHp,
      enemyHp: state.enemyHp,
      enemyName: state.enemyName,
      availableActions: ['ATTACK', 'FLEE', 'USE_ITEM'],
    };
  }

  // ── AKCJA ─────────────────────────────────────────────────────

  async processAction(
    sessionId: string,
    characterId: string,
    action: CombatActionType,
  ) {
    const state = await this.getSession(sessionId);

    if (state.characterId !== characterId) {
      throw new BadRequestException('To nie twoja sesja walki');
    }
    if (state.status !== 'ACTIVE') {
      throw new BadRequestException('Walka już się zakończyła');
    }

    state.characterTurn += 1;  // ← po walidacji
    const turnLog: typeof state.log = [];

    // ── AKCJA GRACZA ──────────────────────────────────────────

    if (action === CombatActionType.FLEE) {
      const escaped = Math.random() < 0.4;
      if (escaped) {
        state.status = 'FLED';
        await this.deleteSession(sessionId);
        await this.prisma.combatSession.update({
          where: { id: sessionId },
          data: { status: 'LOST' },
        });
        return { result: 'Escaped', sessionId, log: [] };
      } else {
        turnLog.push({
          attacker: state.characterName,
          target: state.enemyName,
          damage: 0,
          action: 'FLEE_FAILED',
        });
      }
    } else if (action === CombatActionType.ATTACK) {
      const stepBonus = this.calculateStepBonus(state.characterTotalSteps, state.characterBonus);
      const baseDamage = Math.max(1, state.characterAttack - state.enemyDefense);
      let damage = Math.floor(baseDamage * (1 + stepBonus));

      // ── BONUSY KLAS ───────────────────────────────────────

      // WARRIOR: +20% obrażeń przy HP < 50% maxHp
      if (state.characterBonus === 'WARRIOR') {
        const hpThreshold = state.characterMaxHp * 0.5;
        if (state.playerHp < hpThreshold) {
          damage = Math.floor(damage * 1.2);
          turnLog.push({
            attacker: state.characterName,
            target: state.enemyName,
            damage: 0,
            action: 'WARRIOR_RAGE',
          });
        }
      }

      // DOUBLE_STRIKE: co 3. tura gracza podwójne obrażenia
      if (state.characterBonus === 'DOUBLE_STRIKE' && state.characterTurn % 3 === 0) {
        damage = damage * 2;
        turnLog.push({
          attacker: state.characterName,
          target: state.enemyName,
          damage: 0,
          action: 'DOUBLE_STRIKE',
        });
      }

      // MONK_REGEN: 2% szansa na auto-wygraną
      if (state.characterBonus === 'MONK_REGEN' && Math.random() < 0.02) {
        state.enemyHp = 0;
        turnLog.push({
          attacker: state.characterName,
          target: state.enemyName,
          damage: 0,
          action: 'MONK_INSTANT_WIN',
        });
      }  else {
        state.enemyHp -= damage;  // ← tylko jeśli nie było instant win
      }

      turnLog.push({
        attacker: state.characterName,
        target: state.enemyName,
        damage,
        action: 'ATTACK',
        targetHpAfter: Math.max(0, state.enemyHp),
      });

    } else if (action === CombatActionType.USE_ITEM) {
      const heal = 20;
      state.playerHp = Math.min(state.playerHp + heal, state.characterMaxHp);
      turnLog.push({
        attacker: state.characterName,
        target: state.characterName,
        damage: -heal,
        action: 'USE_ITEM',
      });
    }

    // ── KONTRATAK WROGA (jeśli żyje) ─────────────────────────

    if (state.enemyHp > 0) {
      const enemyDamage = Math.max(1, state.enemyAttack - state.characterDefense);
      state.playerHp -= enemyDamage;
      turnLog.push({
        attacker: state.enemyName,
        target: state.characterName,
        damage: enemyDamage,
        action: 'ATTACK',
        targetHpAfter: Math.max(0, state.playerHp),
      });
    }

    // ── MONK_REGEN: regeneracja HP po turze ──────────────────
    if (state.characterBonus === 'MONK_REGEN' && state.enemyHp > 0) {
      const regen = 5;
      state.playerHp = Math.min(state.playerHp + regen, state.characterMaxHp);
      turnLog.push({
        attacker: state.characterName,
        target: state.characterName,
        damage: -regen,
        action: 'MONK_REGEN',
      });
    }

    // ── KONIEC WALKI? ─────────────────────────────────────────

    state.log.push(...turnLog);
    state.turn += 1;

    if (state.enemyHp <= 0) state.status = 'WON';
    if (state.playerHp <= 0) state.status = 'LOST';

    if (state.status !== 'ACTIVE') {
      return this.finalizeSession(sessionId, state);
    }

    // Tura trwa — zapisz i zwróć stan
    await this.saveSession(sessionId, state);

    return {
      sessionId,
      turn: state.turn,
      playerHp: state.playerHp,
      enemyHp: state.enemyHp,
      turnLog,
      status: 'ACTIVE',
      availableActions: ['ATTACK', 'FLEE', 'USE_ITEM'],
    };
  }

  // ── FINALIZACJA ───────────────────────────────────────────────

private async finalizeSession(sessionId: string, state: CombatSessionState) {
  const won = state.status === 'WON';

  const battle = await this.prisma.battle.create({
    data: {
      characterId: state.characterId,
      enemyId: state.enemyId,
      sessionId,
      status: won ? 'WON' : 'LOST',
      log: state.log,
    },
  });

  await this.prisma.combatSession.update({
    where: { id: sessionId },
    data: { status: won ? 'WON' : 'LOST' },
  });

  let levelUp: { levelsGained: number; newLevel: number; hpGain: number; attackGain: number; defenseGain: number } | null = null;

  if (won) {
    await this.prisma.character.update({
      where: { id: state.characterId },
      data: {
        exp:  { increment: state.enemyExpReward },
        gold: { increment: state.enemyGoldReward },
        hp:   state.playerHp,
      },
    });

    levelUp = await this.handleLeveling(state.characterId);  // ← wywołanie
  }

  await this.deleteSession(sessionId);

  return {
    result: won ? 'Victory!' : 'Defeat',
    sessionId,
    battleId: battle.id,
    remainingHp: state.playerHp,
    rewards: won
      ? { exp: state.enemyExpReward, gold: state.enemyGoldReward }
      : null,
    levelUp,
    log: state.log,
      };
    }

    async getCombatHistory(characterId: string) {
    const battles = await this.prisma.battle.findMany({
      where: { characterId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        log: true,
        enemy: {
          select: {
            name: true,
            level: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // ostatnie 20 walk
    });

    const won = battles.filter(b => b.status === 'WON').length;
    const lost = battles.filter(b => b.status === 'LOST').length;

    return {
      stats: { won, lost, total: battles.length },
      battles,
    };
  }

    private calculateStepBonus(totalSteps: number, bonus: string | null): number {
      const maxSteps = bonus === 'SCOUT' ? 7000 : 5000;
      const maxBonus = bonus === 'SCOUT' ? 0.7 : 0.5;
      const ratio = Math.min(totalSteps, maxSteps) / maxSteps;
      return ratio * maxBonus;
  }

    private async handleLeveling(characterId: string) {
      const character = await this.prisma.character.findUnique({
        where: { id: characterId },
        include: { class: true },
      });

      if (!character) return null;

      const expForNextLevel = character.level * 100;

      if (character.exp < expForNextLevel) return null;

      // Oblicz ile levelów naraz (jeśli zdobył dużo exp)
      let newLevel = character.level;
      let remainingExp = character.exp;

      while (remainingExp >= newLevel * 100) {
        remainingExp -= newLevel * 100;
        newLevel += 1;
      }

      const levelsGained = newLevel - character.level;

      // Przelicz statystyki na podstawie klasy
      const hpGain     = (character.class?.hpPerLevel ?? 10) * levelsGained;
      const attackGain = (character.class?.attackPerLevel ?? 2) * levelsGained;
      const defenseGain = (character.class?.defensePerLevel ?? 1) * levelsGained;

      // Mnich nie skaluje ataku
      const finalAttackGain = character.class?.bonus === 'MONK_REGEN' ? 0 : attackGain;

      await this.prisma.character.update({
        where: { id: characterId },
        data: {
          level:   newLevel,
          exp:     remainingExp,
          maxHp:   { increment: hpGain },
          hp:      { increment: hpGain }, // HP rośnie razem z maxHp
          attack:  { increment: finalAttackGain },
          defense: { increment: defenseGain },
        },
      });

      return { levelsGained, newLevel, hpGain, attackGain: finalAttackGain, defenseGain };
    }
}