import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_TOKEN = Symbol('REDIS_TOKEN');

const redisProvider = {
  provide: REDIS_TOKEN,
  useFactory: (): Redis => {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    return new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}
  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }
}
