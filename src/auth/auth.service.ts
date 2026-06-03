import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
      },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Pobierz characterId
    const character = await this.prisma.character.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        characterId: character?.id ?? null,
      }),
      hasCharacter: !!character,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true, // <--- ZWRACAMY AVATAR
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // --- NOWA METODA: Aktualizacja profilu ---
  async updateProfile(userId: string, data: { username?: string; avatarUrl?: string | null }) {
    // Jeśli użytkownik zmienia nick, sprawdzamy czy nie jest zajęty
    if (data.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: data.username,
          id: { not: userId }, // Wykluczamy własne konto z poszukiwań
        },
      });

      if (existingUser) {
        throw new ConflictException('Ten nick jest już zajęty przez innego gracza!');
      }
    }

    // Zapisujemy nowe dane
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
      }
    });

    return updatedUser;
  }

  // Metoda usuwająca całkowicie użytkownika z bazy danych
  async deleteAccount(userId: string) {
    // 1. Znajdź postać gracza (żeby móc usunąć jej walki i sesje)
    const character = await this.prisma.character.findUnique({
      where: { userId }
    });

    if (character) {
      // Usuwamy dane zależne postaci
      await this.prisma.battle.deleteMany({ where: { characterId: character.id } });
      await this.prisma.combatSession.deleteMany({ where: { characterId: character.id } });
      await this.prisma.discoveredPlace.deleteMany({ where: { characterId: character.id } });
      // Na końcu usuwamy samą postać
      await this.prisma.character.delete({ where: { id: character.id } });
    }

    // 2. Usuwamy powiązane z kontem kroki (StepRecords)
    await this.prisma.stepRecord.deleteMany({ where: { userId } });

    // 3. Usuwamy ostatecznie konto gracza
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'Konto zostało pomyślnie usunięte' };
  }
}