import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnemiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.enemy.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        hp: true,
        attack: true,
        defense: true,
        goldReward: true,
        expReward: true,
        imageUrl: true,
      },
      orderBy: { level: 'asc' },
    });
  }
}