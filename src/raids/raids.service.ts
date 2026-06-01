import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RaidsService {
  constructor(private prisma: PrismaService) {}

  async startRaid(userId: string) {
    // 1. Znajdź postać atakującego
    const attacker = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!attacker) {
      throw new NotFoundException('Musisz najpierw stworzyć postać!');
    }

    // 2. Sprawdź czy już atakuje lub jest atakowany (opcjonalnie: gracz może atakować tylko raz na raz)
    const existingRaid = await this.prisma.raid.findFirst({
      where: {
        attackerId: attacker.id,
        status: 'PENDING',
      },
    });

    if (existingRaid) {
      throw new BadRequestException('Twoje wojska są już w trakcie innego najazdu!');
    }

    // 3. Wylosuj obrońcę (inny gracz)
    const totalCharacters = await this.prisma.character.count();
    if (totalCharacters < 2) {
      throw new BadRequestException('W świecie gry nie ma jeszcze innych osad do zaatakowania.');
    }

    // Proste losowanie: bierzemy postać o podobnym poziomie (np. +/- 5)
    const potentialDefenders = await this.prisma.character.findMany({
      where: {
        id: { not: attacker.id },
        level: {
          gte: Math.max(1, attacker.level - 5),
          lte: attacker.level + 5,
        },
      },
      take: 10,
    });

    if (potentialDefenders.length === 0) {
      throw new BadRequestException('Nie znaleziono osady o zbliżonej sile obronnej.');
    }

    const defender = potentialDefenders[Math.floor(Math.random() * potentialDefenders.length)];

    // 4. Stwórz najazd (trwa 2 godziny)
    const durationHours = 2;
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + durationHours);

    return this.prisma.raid.create({
      data: {
        attackerId: attacker.id,
        defenderId: defender.id,
        endTime,
        status: 'PENDING',
        winChance: 0.7, // 70% szansy bazowo
      },
      include: {
        defender: {
          select: { name: true, level: true },
        },
      },
    });
  }

  async getActiveRaids(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) return { attacking: null, defending: null };

    // Najpierw rozwiąż zakończone najazdy tego gracza
    await this.resolveExpiredRaids(character.id);

    const attacking = await this.prisma.raid.findFirst({
      where: { attackerId: character.id, status: 'PENDING' },
      include: { defender: { select: { name: true, level: true } } },
    });

    const defending = await this.prisma.raid.findFirst({
      where: { defenderId: character.id, status: 'PENDING' },
      include: { attacker: { select: { name: true, level: true } } },
    });

    return { attacking, defending };
  }

  async repelRaid(userId: string, raidId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Postać nie istnieje.');
    }

    const raid = await this.prisma.raid.findUnique({
      where: { id: raidId },
    });

    if (!raid || raid.status !== 'PENDING') {
      throw new BadRequestException('Ten najazd nie jest już aktywny.');
    }

    if (raid.defenderId !== character.id) {
      throw new UnauthorizedException('Nie możesz odpierać ataku na obcą osadę!');
    }

    // Odepchnięcie ataku — atakujący przegrywa
    return this.prisma.raid.update({
      where: { id: raidId },
      data: { status: 'REPELLED' },
    });
  }

  private async resolveExpiredRaids(characterId: string) {
    const expiredRaids = await this.prisma.raid.findMany({
      where: {
        OR: [
          { attackerId: characterId },
          { defenderId: characterId }
        ],
        status: 'PENDING',
        endTime: { lte: new Date() },
      },
    });

    for (const raid of expiredRaids) {
      const roll = Math.random();
      const won = roll < raid.winChance;

      await this.prisma.raid.update({
        where: { id: raid.id },
        data: { status: won ? 'WON' : 'LOST' },
      });

      if (won) {
        // Nagroda dla atakującego
        await this.prisma.character.update({
          where: { id: raid.attackerId },
          data: {
            gold: { increment: 150 },
            exp: { increment: 50 },
          },
        });
      }
    }
  }
}
