import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './common/health/health.module';
import { MetricsModule } from './common/metrics/metrics.module';

import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { CharactersModule } from './modules/characters/characters.module';
import { ItemsModule } from './modules/items/items.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RegionsModule } from './modules/regions/regions.module';
import { QuestsModule } from './modules/quests/quests.module';
import { CombatModule } from './modules/combat/combat.module';
import { GuildsModule } from './modules/guilds/guilds.module';
import { ChatModule } from './modules/chat/chat.module';
import { EventsModule } from './modules/events/events.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // LOG_PRETTY=true forces pino-pretty regardless of NODE_ENV. Set in
        // docker-compose for readable local container logs; unset in Railway.
        transport:
          process.env.LOG_PRETTY === 'true' || (process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== 'false')
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
        customProps: (req) => ({ requestId: (req as any).requestId }),
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 10_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true, maxListeners: 50 }),

    DatabaseModule,
    RedisModule,
    HealthModule,
    MetricsModule,

    AuthModule,
    PlayersModule,
    CharactersModule,
    ItemsModule,
    InventoryModule,
    RegionsModule,
    QuestsModule,
    CombatModule,
    GuildsModule,
    ChatModule,
    EventsModule,
    MarketplaceModule,
    LeaderboardsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
  ],
})
export class AppModule {}
