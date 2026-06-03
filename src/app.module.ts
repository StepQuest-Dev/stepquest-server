import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StepsModule } from './steps/steps.module';
import { CombatModule } from './combat/combat.module';
import configuration from './config/configuration';
import { EnemiesModule } from './enemies/enemies.module';
import { CharacterModule } from './character/character.module';
import { PlacesModule } from './places/places.module';
import { RaidsModule } from './raids/raids.module';
import { ClassesModule } from './classes/classes.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get('redis.host')}:${config.get('redis.port')}`,
      }),
    }),

    PrismaModule,
    AuthModule,
    StepsModule,
    CombatModule,
    EnemiesModule,
    CharacterModule,
    PlacesModule,
    RaidsModule,
    ClassesModule,
    InventoryModule,
  ],
})
export class AppModule {}
