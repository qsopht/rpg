/**
 * Production migration runner. Invoked from Railway's startCommand:
 *   node dist/database/migrate.js && node dist/main.js
 */
import knex from 'knex';
import config from './knexfile';

async function main() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const db = knex(config[env]);
  const rollback = process.argv.includes('--rollback');
  try {
    if (rollback) {
      const [batchNo, migrations] = await db.migrate.rollback();
      console.log(`[migrate] rolled back batch ${batchNo}: ${migrations.length} migrations`);
      for (const m of migrations) console.log(`  - ${m}`);
    } else {
      const [batchNo, migrations] = await db.migrate.latest();
      if (migrations.length === 0) {
        console.log('[migrate] schema up to date');
      } else {
        console.log(`[migrate] batch ${batchNo}: applied ${migrations.length}`);
        for (const m of migrations) console.log(`  - ${m}`);
      }
    }
  } finally {
    await db.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[migrate] failed', e);
    process.exit(1);
  });
