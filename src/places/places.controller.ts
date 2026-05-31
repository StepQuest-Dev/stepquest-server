import { Controller, Post, Body, Request, UseGuards, Get, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlacesService } from './places.service';

@UseGuards(AuthGuard('jwt'))
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  async getDiscoveredPlaces(@Request() req: any) {
    return this.placesService.getDiscoveredPlaces(req.user.characterId);
  }

  @Post('discover')
  async discoverPlace(@Body() dto: { lat: number, lon: number }, @Request() req: any) {
    return this.placesService.discoverPlace(req.user.characterId, dto.lat, dto.lon);
  }

  @Post('collect/:id')
  async collectPlace(
    @Param('id') id: string,
    @Body() dto: { lat: number, lon: number },
    @Request() req: any,
  ) {
    return this.placesService.collectPlace(req.user.characterId, id, dto.lat, dto.lon);
  }
}
