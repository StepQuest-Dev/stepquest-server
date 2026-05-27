import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStepDto } from './dto/create-step.dto';

@Injectable()
export class StepsService {
  constructor(private prisma: PrismaService) {}

  async saveSteps(userId: string, dto: CreateStepDto) {
    if (dto.count <= 0) {
      throw new BadRequestException('count must be greater than 0');
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    return this.prisma.stepRecord.create({
      data: {
        userId,
        count: dto.count,
        recordedAt,
        source: dto.source,
      },
    });
  }

  async listSteps(userId: string) {
    const records = await this.prisma.stepRecord.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });

    const aggregated = await this.prisma.stepRecord.aggregate({
      where: { userId },
      _sum: { count: true },
    });

    return {
      totalSteps: aggregated._sum.count ?? 0,
      records,
    };
  }

  async getLatestStep(userId: string) {
    return this.prisma.stepRecord.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
