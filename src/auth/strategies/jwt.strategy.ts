import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'twój-sekretny-klucz-fallback',
    });
  }

  async validate(payload: { sub: any; characterId: string | null }) {
    console.log('--- [STRATEGY] Odkodowany payload z tokenu JWT ---', payload);
    
    // Zwracamy spójny obiekt, który ląduje w request.user
    return { 
      userId: payload.sub, 
      characterId: payload.characterId 
    };
  }
}