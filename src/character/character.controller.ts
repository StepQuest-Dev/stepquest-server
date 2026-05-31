import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CharacterService } from './character.service';

@UseGuards(AuthGuard('jwt'))
@Controller('character')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get()
  async getCharacter(@Request() req: any) {
    // Bezpieczne pobieranie ID
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.characterService.getCharacter(userId);
  }

  @Post()
  async createCharacter(
    @Request() req: any,
    @Body() body: { name: string; classId: string }
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.characterService.createCharacter(userId, body.name, body.classId);
  }

  @Delete(':id')
  async deleteCharacter(
    @Request() req: any,
    @Param('id') characterId: string
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return this.characterService.deleteCharacter(userId, characterId);
  }
}