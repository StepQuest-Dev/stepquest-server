import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { CombatActionType } from './dto/combat-action.dto';

interface CombatSessionState {
  characterId: string; // Prawdziwe ID postaci (UUID z tabeli Character)
  userId: string;      // ID zalogowanego gracza (dla bezpiecznej weryfikacji)
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
  enemyName: string;
  enemyImageUrl: string | null;
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

  async startCombat(userId: string, enemyId: string) {

    // 1. ZNAJDŹ POSTAĆ NA PODSTAWIE userId Z TOKENA
    const character = await this.prisma.character.findUnique({
      where: { userId }, 
      include: { 
        class: true,
        inventory: {
          include: { item: true }
        }
      },
    });

    const enemy = await this.prisma.enemy.findUnique({
      where: { id: enemyId },
    });

    if (!character || !enemy) {
      throw new NotFoundException('Postać gracza lub przeciwnik nie istnieje');
    }

    // Obliczanie bonusów z ekwipunku
    let attackBonus = 0;
    let defenseBonus = 0;
    let hpBonus = 0;

    character.inventory.forEach(inv => {
      if (inv.isEquipped) {
        attackBonus += inv.item.attackBonus;
        defenseBonus += inv.item.defenseBonus;
        hpBonus += inv.item.hpBonus;
      }
    });

    const effectiveAttack = character.attack + attackBonus;
    const effectiveDefense = character.defense + defenseBonus;
    const effectiveMaxHp = character.maxHp + hpBonus;
    const effectiveHp = Math.min(character.hp, effectiveMaxHp); // Zachowaj aktualne HP, ale nie więcej niż nowe max

    // 2. TWORZENIE SESJI: Używamy character.id (prawdziwego ID postaci)!
    const session = await this.prisma.combatSession.create({
      data: { 
        characterId: character.id, // TO NAPRAWIA TWÓJ BŁĄD P2003
        enemyId, 
        status: 'PENDING' 
      },
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
      characterId: character.id, // ID postaci
      userId: character.userId,  // ID gracza
      enemyId,
      playerHp: effectiveHp,
      enemyHp: enemy.hp,
      turn: 1,
      log: [],
      status: 'ACTIVE',
      characterName: character.name,
      characterAttack: effectiveAttack,
      characterDefense: effectiveDefense,
      characterMaxHp: effectiveMaxHp,
      characterTotalSteps: stepsToday,
      characterClass: character.class?.name ?? null,
      characterBonus: character.class?.bonus ?? null,
      characterTurn: 0,
      enemyName: enemy.name,
      enemyImageUrl: enemy.imageUrl,
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
      enemyImageUrl: state.enemyImageUrl,
      availableActions: ['ATTACK', 'FLEE', 'USE_ITEM'],
    };
  }

  // ── AKCJA ─────────────────────────────────────────────────────

  async processAction(
    sessionId: string,
    userId: string, // UWAGA: tu też przychodzi userId z kontrolera
    action: CombatActionType,
  ) {
    const state = await this.getSession(sessionId);

    // Weryfikacja po userId zabezpiecza, by żaden inny gracz nie kliknął akcji w tej sesji
    if (state.userId !== userId) {
      throw new BadRequestException('To nie twoja sesja walki');
    }
    if (state.status !== 'ACTIVE') {
      throw new BadRequestException('Walka już się zakończyła');
    }

    state.characterTurn += 1;
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
        state.enemyHp -= damage;
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
      enemyName: state.enemyName,
      enemyImageUrl: state.enemyImageUrl,
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
        characterId: state.characterId, // Tu też używamy zapisanego w sesji character.id
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

      levelUp = await this.handleLeveling(state.characterId);
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

  // ── POBIERANIE HISTORII ────────────────────────────────────────

  async getCombatHistory(userId: string) { // UWAGA: przychodzi userId!
    // Najpierw pobierz id postaci, do której należy historia
    const character = await this.prisma.character.findUnique({
      where: { userId }
    });

    if (!character) {
      return { stats: { won: 0, lost: 0, total: 0 }, battles: [] };
    }

    const battles = await this.prisma.battle.findMany({
      where: { characterId: character.id }, // Używamy character.id
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
      take: 20, 
    });

    const won = battles.filter(b => b.status === 'WON').length;
    const lost = battles.filter(b => b.status === 'LOST').length;

    return {
      stats: { won, lost, total: battles.length },
      battles,
    };
  }

  // ── SYSTEMY WEWNĘTRZNE ─────────────────────────────────────────

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

    let newLevel = character.level;
    let remainingExp = character.exp;

    while (remainingExp >= newLevel * 100) {
      remainingExp -= newLevel * 100;
      newLevel += 1;
    }

    const levelsGained = newLevel - character.level;

    const hpGain     = (character.class?.hpPerLevel ?? 10) * levelsGained;
    const attackGain = (character.class?.attackPerLevel ?? 2) * levelsGained;
    const defenseGain = (character.class?.defensePerLevel ?? 1) * levelsGained;

    const finalAttackGain = character.class?.bonus === 'MONK_REGEN' ? 0 : attackGain;

    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        level:   newLevel,
        exp:     remainingExp,
        maxHp:   { increment: hpGain },
        hp:      { increment: hpGain },
        attack:  { increment: finalAttackGain },
        defense: { increment: defenseGain },
      },
    });

    return { levelsGained, newLevel, hpGain, attackGain: finalAttackGain, defenseGain };
  }
}