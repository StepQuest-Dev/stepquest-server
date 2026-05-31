import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CharacterService {
  constructor(private prisma: PrismaService) {}

  async getCharacter(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        level: true,
        exp: true,
        gold: true,
        hp: true,
        maxHp: true,
        attack: true,
        defense: true,
        totalSteps: true,
        createdAt: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Postać nie istnieje');
    }

    return character;
  }
}