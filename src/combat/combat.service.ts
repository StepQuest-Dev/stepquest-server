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
  enemyName: string;
  enemyAttack: number;
  enemyDefense: number;
  enemyExpReward: number;
  enemyGoldReward: number;
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
  console.log('GET session:', sessionId, '→', raw ? 'FOUND' : 'NOT FOUND');
  if (!raw) throw new NotFoundException('Sesja walki nie istnieje lub wygasła');
  return JSON.parse(raw) as CombatSessionState;
}

private async saveSession(sessionId: string, state: CombatSessionState) {
  const result = await this.redis.set(
    this.sessionKey(sessionId),
    JSON.stringify(state),
    'EX',
    SESSION_TTL_SECONDS,
  );
  console.log('SAVE session:', sessionId, '→', result, 'turn:', state.turn, 'enemyHp:', state.enemyHp);
}

  private async deleteSession(sessionId: string) {
    await this.redis.del(this.sessionKey(sessionId));
  }

  // ── START ─────────────────────────────────────────────────────

  async startCombat(characterId: string, enemyId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
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

    const turnLog: typeof state.log = [];

    // ── AKCJA GRACZA ──────────────────────────────────────────

    if (action === CombatActionType.FLEE) {
      // 40% szansy na ucieczkę
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
      const damage = Math.max(1, state.characterAttack - state.enemyDefense);
      state.enemyHp -= damage;
      turnLog.push({
        attacker: state.characterName,
        target: state.enemyName,
        damage,
        action: 'ATTACK',
        targetHpAfter: Math.max(0, state.enemyHp),
      });
    } else if (action === CombatActionType.USE_ITEM) {
      // Placeholder — rozbuduj gdy dodasz ekwipunek
      const heal = 20;
      state.playerHp = Math.min(state.playerHp + heal, state.characterMaxHp);
      turnLog.push({
        attacker: state.characterName,
        target: state.characterName,
        damage: -heal, // ujemna = leczenie
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

    // Zapisz Battle w Postgresie
    const battle = await this.prisma.battle.create({
      data: {
        characterId: state.characterId,
        enemyId: state.enemyId,
        sessionId,
        status: won ? 'WON' : 'LOST',
        log: state.log,
      },
    });

    // Zaktualizuj status sesji
    await this.prisma.combatSession.update({
      where: { id: sessionId },
      data: { status: won ? 'WON' : 'LOST' },
    });

    // Nagrody jeśli wygrał
    if (won) {
      await this.prisma.character.update({
        where: { id: state.characterId },
        data: {
          exp:  { increment: state.enemyExpReward },
          gold: { increment: state.enemyGoldReward },
          hp:   state.playerHp, // zapisz aktualne HP
        },
      });
    }

    // Wyczyść Redis
    await this.deleteSession(sessionId);

    return {
      result: won ? 'Victory!' : 'Defeat',
      sessionId,
      battleId: battle.id,
      remainingHp: state.playerHp,
      rewards: won
        ? { exp: state.enemyExpReward, gold: state.enemyGoldReward }
        : null,
      log: state.log,
    };
  }
}