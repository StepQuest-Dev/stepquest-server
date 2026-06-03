import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getCharacterInventory(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        inventory: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Postać nie istnieje');
    }

    return character.inventory;
  }

  async equipItem(userId: string, inventoryItemId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { inventory: { include: { item: true } } },
    });

    if (!character) {
      throw new NotFoundException('Postać nie istnieje');
    }

    const inventoryItem = character.inventory.find((i) => i.id === inventoryItemId);
    if (!inventoryItem) {
      throw new NotFoundException('Przedmiot nie znajduje się w ekwipunku');
    }

    if (!inventoryItem.item.slot) {
      throw new Error('Tego przedmiotu nie można założyć');
    }

    // Zdejmij inne przedmioty z tego samego slotu
    await this.prisma.inventoryItem.updateMany({
      where: {
        characterId: character.id,
        item: { slot: inventoryItem.item.slot },
        isEquipped: true,
      },
      data: { isEquipped: false },
    });

    // Załóż nowy przedmiot
    return this.prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { isEquipped: true },
    });
  }

  async unequipItem(userId: string, inventoryItemId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Postać nie istnieje');
    }

    return this.prisma.inventoryItem.update({
      where: { id: inventoryItemId, characterId: character.id },
      data: { isEquipped: false },
    });
  }
}
