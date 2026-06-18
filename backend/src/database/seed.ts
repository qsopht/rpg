/**
 * One-shot seed loader.
 * Reads JSON content from `content/` and upserts into the static tables.
 *
 * Usage: npm run seed
 */
import knex from 'knex';
import * as path from 'path';
import * as fs from 'fs';
import config from './knexfile';

async function main() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const db = knex(config[env]);
  const contentDir = resolveContentDir();

  const load = (name: string) => {
    const p = path.join(contentDir, `${name}.json`);
    if (!fs.existsSync(p)) {
      console.warn(`[seed] missing ${p} — skipping`);
      return [];
    }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  };

  try {
    const regions = load('regions');
    const enemies = load('enemies');
    const items = load('items');
    const quests = load('quests');

    // pg serializes JS arrays as PostgreSQL arrays unless told otherwise; for
    // JSONB columns we must hand it a JSON string (or knex.raw cast).
    const stringifyJsonb = (rows: any[], fields: string[]) =>
      rows.map((r) => {
        const out = { ...r };
        for (const f of fields) {
          if (out[f] !== undefined && out[f] !== null && typeof out[f] !== 'string') {
            out[f] = JSON.stringify(out[f]);
          }
        }
        return out;
      });

    await db.transaction(async (trx) => {
      if (items.length) {
        await trx('items')
          .insert(stringifyJsonb(items, ['stats']))
          .onConflict('id')
          .merge();
      }
      if (regions.length) {
        await trx('regions')
          .insert(stringifyJsonb(regions, ['enemy_pool']))
          .onConflict('id')
          .merge();
      }
      if (enemies.length) {
        await trx('enemies')
          .insert(stringifyJsonb(enemies, ['stats', 'loot_table']))
          .onConflict('id')
          .merge();
      }
      if (quests.length) {
        await trx('quests')
          .insert(stringifyJsonb(quests, ['requirements', 'rewards']))
          .onConflict('id')
          .merge();
      }
    });
    console.log(
      `[seed] upserted: ${items.length} items, ${regions.length} regions, ${enemies.length} enemies, ${quests.length} quests`,
    );
  } finally {
    await db.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  });

/**
 * Find the content directory across deployment shapes:
 *  - Docker image: WORKDIR /app, content at /app/content
 *  - Local dev (npm run seed): cwd = backend/, content at ../content
 *  - CONTENT_DIR env override always wins (absolute or relative-to-cwd)
 */
function resolveContentDir(): string {
  const env = process.env.CONTENT_DIR;
  if (env) return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  // Try /app/content (docker), then ../content (local dev), then ../../content
  const candidates = [
    path.resolve(process.cwd(), 'content'),
    path.resolve(process.cwd(), '../content'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
}
