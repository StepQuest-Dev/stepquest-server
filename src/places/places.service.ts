import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PlacesService {
  constructor(private prisma: PrismaService) {}

  async getDiscoveredPlaces(characterId: string) {
    return this.prisma.discoveredPlace.findMany({
      where: { characterId },
      orderBy: { discoveredAt: 'desc' },
    });
  }

  async discoverPlace(characterId: string, lat: number, lon: number) {
    // 1. Sprawdź co gracz już odkrył
    const alreadyDiscovered = await this.prisma.discoveredPlace.findMany({
      where: { characterId },
      select: { osmId: true },
    });
    const discoveredIds = new Set(alreadyDiscovered.map((p) => p.osmId));

    // 2. Zapytaj Overpass API o miejsca w okolicy (promień 5km)
    // Szukamy historic=* lub tourism=museum, viewpoint, attraction
    const radius = 5000;
    const query = `
      [out:json][timeout:25];
      (
        node["historic"](around:${radius},${lat},${lon});
        way["historic"](around:${radius},${lat},${lon});
        node["tourism"~"museum|viewpoint|attraction"](around:${radius},${lat},${lon});
        way["tourism"~"museum|viewpoint|attraction"](around:${radius},${lat},${lon});
      );
      out center;`;

    let osmData;
    try {
      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'StepQuest-App/1.0',
          },
        },
      );
      osmData = response.data;
    } catch (error: any) {
      console.error('Overpass Error Details:', error.response?.data || error.message);
      throw new InternalServerErrorException(
        'Błąd komunikacji z mapą świata (Overpass API): ' + (error.response?.statusText || error.message),
      );
    }

    if (!osmData.elements || osmData.elements.length === 0) {
      throw new BadRequestException('W tej okolicy nie ma żadnych ikonicznych miejsc do odkrycia.');
    }

    // 3. Odfiltruj już odkryte i te bez nazwy
    const availablePlaces = osmData.elements.filter((el) => {
      const id = `${el.type}/${el.id}`;
      return !discoveredIds.has(id) && el.tags && el.tags.name;
    });

    if (availablePlaces.length === 0) {
      throw new BadRequestException('Odkryłeś już wszystkie znane miejsca w tej okolicy!');
    }

    // 4. Wylosuj jedno miejsce
    const randomPlace = availablePlaces[Math.floor(Math.random() * availablePlaces.length)];
    const name = randomPlace.tags.name;
    const placeLat = randomPlace.lat || randomPlace.center?.lat;
    const placeLon = randomPlace.lon || randomPlace.center?.lon;
    const osmId = `${randomPlace.type}/${randomPlace.id}`;

    // 5. Zapisz w bazie
    const newPlace = await this.prisma.discoveredPlace.create({
      data: {
        characterId,
        name,
        lat: placeLat,
        lon: placeLon,
        osmId,
      },
    });

    return newPlace;
  }

  async collectPlace(characterId: string, placeId: string, playerLat: number, playerLon: number) {
    const place = await this.prisma.discoveredPlace.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      throw new BadRequestException('Miejsce nie istnieje.');
    }

    if (place.characterId !== characterId) {
      throw new BadRequestException('To nie Twoje miejsce!');
    }

    if (place.isCollected) {
      throw new BadRequestException('To miejsce zostało już przez Ciebie odwiedzone.');
    }

    // 1. Sprawdź dystans (Haversine formula)
    const distance = this.calculateDistance(playerLat, playerLon, place.lat, place.lon);
    const MIN_DISTANCE_METERS = 150; // Gracz musi być w promieniu 150m

    if (distance > MIN_DISTANCE_METERS) {
      throw new BadRequestException(`Jesteś za daleko! Musisz podejść bliżej (pozostało ok. ${Math.round(distance - MIN_DISTANCE_METERS)}m).`);
    }

    // 2. Nagrody
    const rewardExp = 100;
    const rewardGold = 50;

    const updatedPlace = await this.prisma.discoveredPlace.update({
      where: { id: placeId },
      data: {
        isCollected: true,
        collectedAt: new Date(),
      },
    });

    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        exp: { increment: rewardExp },
        gold: { increment: rewardGold },
      },
    });

    return {
      success: true,
      placeName: place.name,
      rewards: { exp: rewardExp, gold: rewardGold },
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Promień ziemi w metrach
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Dystans w metrach
  }
}
