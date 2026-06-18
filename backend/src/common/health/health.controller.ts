import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Knex } from 'knex';
import { Redis } from 'ioredis';
import { KNEX_TOKEN } from '../../database/database.module';
import { REDIS_TOKEN } from '../../redis/redis.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, 'ok' | 'fail'> = {};
    try {
      await this.db.raw('select 1');
      checks.db = 'ok';
    } catch {
      checks.db = 'fail';
    }
    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'fail';
    }
    const ok = Object.values(checks).every((v) => v === 'ok');
    return { status: ok ? 'ok' : 'degraded', checks };
  }
}
