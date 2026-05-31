import { Controller, Post, Body, Request, UseGuards, Get, Param, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlacesService } from './places.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller('places')
export class PlacesController {
  constructor(
    private readonly placesService: PlacesService,
    private readonly prisma: PrismaService,
  ) {}

  private async getCharacterId(req: any): Promise<string> {
    if (req.user.characterId) {
      return req.user.characterId;
    }

    // Jeśli brak w tokenie, pobierz z bazy (użytkownik mógł stworzyć postać po zalogowaniu)
    const character = await this.prisma.character.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!character) {
      throw new UnauthorizedException('Musisz najpierw stworzyć postać!');
    }

    return character.id;
  }

  @Get()
  async getDiscoveredPlaces(@Request() req: any) {
    const characterId = await this.getCharacterId(req);
    return this.placesService.getDiscoveredPlaces(characterId);
  }

  @Post('discover')
  async discoverPlace(@Body() dto: { lat: number, lon: number }, @Request() req: any) {
    const characterId = await this.getCharacterId(req);
    return this.placesService.discoverPlace(characterId, dto.lat, dto.lon);
  }

  @Post('collect/:id')
  async collectPlace(
    @Param('id') id: string,
    @Body() dto: { lat: number, lon: number },
    @Request() req: any,
  ) {
    const characterId = await this.getCharacterId(req);
    return this.placesService.collectPlace(characterId, id, dto.lat, dto.lon);
  }
}
