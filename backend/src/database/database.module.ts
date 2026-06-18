import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import knex, { Knex } from 'knex';

export const KNEX_TOKEN = Symbol('KNEX_TOKEN');

const knexProvider = {
  provide: KNEX_TOKEN,
  useFactory: (): Knex => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    return knex({
      client: 'pg',
      connection: url,
      pool: { min: 2, max: 10 },
      asyncStackTraces: process.env.NODE_ENV !== 'production',
    });
  },
};

@Global()
@Module({
  providers: [knexProvider],
  exports: [knexProvider],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor() {}
  async onModuleDestroy() {
    // Knex destroyed via app shutdown hook; explicit destroy if needed
  }
}
