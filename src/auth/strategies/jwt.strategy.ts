import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'change-me',
    });
  }

  async validate(payload: { sub: string; characterId: string | null }) {
    // Sprawdzamy czy użytkownik faktycznie istnieje w bazie danych
    // Zapobiega to błędom "Phantom Accounts" po usunięciu bazy/użytkownika
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Konto nie istnieje lub zostało usunięte.');
    }

    return { userId: payload.sub, characterId: payload.characterId };
  }
}
