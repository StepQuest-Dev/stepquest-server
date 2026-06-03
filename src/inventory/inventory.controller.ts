import { Controller, Get, Post, Body, UseGuards, Request, Param, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';

@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventory(@Request() req: any) {
    const userId = req.user.userId;
    return this.inventoryService.getCharacterInventory(userId);
  }

  @Post('equip/:id')
  equip(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.inventoryService.equipItem(userId, id);
  }

  @Post('unequip/:id')
  unequip(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.inventoryService.unequipItem(userId, id);
  }
}
