import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.class.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        baseHp: true,
        baseAttack: true,
        baseDefense: true,
        hpPerLevel: true,
        attackPerLevel: true,
        defensePerLevel: true,
        bonus: true,
      },
    });
  }
}