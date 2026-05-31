import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // --- NOWA METODA: Tworzenie postaci ---
 // --- NOWA METODA: Tworzenie postaci ---
  async createCharacter(userId: string, name: string, classId: string) {
    // 1. Upewnijmy się, że gracz nie ma jeszcze postaci
    const existingChar = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (existingChar) {
      throw new BadRequestException('Posiadasz już postać. Usuń starą, aby stworzyć nową.');
    }

    // 2. Pobieramy bazowe statystyki klasy (używamy ['class'] bo to słowo kluczowe)
    const charClass = await this.prisma['class'].findUnique({
      where: { id: classId },
    });

    if (!charClass) {
      throw new BadRequestException('Wybrana klasa nie istnieje.');
    }

    // 3. Tworzymy postać w bazie
    const newCharacter = await this.prisma.character.create({
      data: {
        userId,
        name,
        classId,
        level: 1,
        exp: 0,
        gold: 100,
        hp: charClass.baseHp,
        maxHp: charClass.baseHp,
        attack: charClass.baseAttack,
        defense: charClass.baseDefense,
        totalSteps: 0,
      },
    });

    return newCharacter;
  }

  // --- NOWA METODA: Usuwanie postaci ---
 // --- NOWA METODA: Usuwanie postaci ---
  async deleteCharacter(userId: string, characterId: string) {
    // 1. Sprawdzamy czy postać należy do tego konkretnego gracza (dla bezpieczeństwa)
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, userId },
    });

    if (!character) {
      throw new NotFoundException('Nie znaleziono postaci lub nie masz do niej uprawnień.');
    }

    // 2. CZYSZCZENIE HISTORII: Usuwamy wszystkie powiązane rekordy!
    // Kolejność jest ważna, najpierw usuwamy tabele zależne.
    await this.prisma.battle.deleteMany({
      where: { characterId: characterId }
    });
    
    await this.prisma.combatSession.deleteMany({
      where: { characterId: characterId }
    });

    await this.prisma.discoveredPlace.deleteMany({
      where: { characterId: characterId }
    });

    // 3. Gdy historia jest czysta, możemy bezpiecznie usunąć postać
    await this.prisma.character.delete({
      where: { id: characterId },
    });

    return { message: 'Wojownik został pomyślnie porzucony.' };
  }

  
}