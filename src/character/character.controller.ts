import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CharacterService } from './character.service';

@UseGuards(AuthGuard('jwt'))
@Controller('character')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get()
  async getCharacter(@Request() req: any) {
    return this.characterService.getCharacter(req.user.userId);
  }
}