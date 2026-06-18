import type { Knex } from 'knex';
import * as path from 'path';
import * as dotenv from 'dotenv';

// The knex CLI cd's into src/database before requiring this file, so the
// caller's CWD is lost. Load backend/.env explicitly so DATABASE_URL et al.
// reach this process whether we're invoked via `npm run migrate` or `node`.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Local default targets docker-compose's host-mapped port (5433 — see
// infra/docker-compose.yml) because a Windows Postgres service typically
// owns 5432. Override via DATABASE_URL in backend/.env or the environment.
const LOCAL_DEFAULT = 'postgres://aetheria:aetheria@localhost:5433/aetheria';

const config: { [k: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL ?? LOCAL_DEFAULT,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
      extension: 'ts',
    },
    seeds: { directory: path.resolve(__dirname, 'seeds') },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
      extension: 'js',
      loadExtensions: ['.js'],
    },
    pool: { min: 2, max: 10 },
  },
};

export default config;
