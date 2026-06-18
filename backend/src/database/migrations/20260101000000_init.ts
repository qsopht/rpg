import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'); // gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "citext"');

  // ---------------- USERS / AUTH ----------------
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.specificType('email', 'citext').notNullable().unique();
    t.string('password_hash', 255).nullable(); // null => social-only
    t.string('google_sub', 64).nullable().unique();
    t.string('apple_sub', 64).nullable().unique();
    t.boolean('email_verified').notNullable().defaultTo(false);
    t.enu('role', ['player', 'admin'], { useNative: true, enumName: 'user_role' })
      .notNullable()
      .defaultTo('player');
    t.boolean('is_banned').notNullable().defaultTo(false);
    t.timestamp('chat_muted_until').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('family_id').notNullable(); // rotation family
    t.string('token_hash', 128).notNullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();
    t.string('replaced_by', 128).nullable();
    t.string('user_agent', 255).nullable();
    t.string('ip', 64).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['family_id']);
    t.index(['token_hash']);
  });

  // ---------------- PLAYERS ----------------
  await knex.schema.createTable('players', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.string('display_name', 32).notNullable().unique();
    t.string('avatar_id', 64).nullable();
    t.text('bio').nullable();
    t.integer('gold').notNullable().defaultTo(0);
    t.integer('gems').notNullable().defaultTo(0);
    t.timestamp('last_seen_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.index(['display_name']);
  });

  // ---------------- CHARACTERS ----------------
  await knex.schema.createTable('characters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    t.string('name', 32).notNullable();
    t.enu('class', ['warrior', 'ranger', 'mage'], { useNative: true, enumName: 'character_class' })
      .notNullable();
    t.integer('level').notNullable().defaultTo(1);
    t.bigInteger('xp').notNullable().defaultTo(0);
    t.integer('skill_points').notNullable().defaultTo(0);
    t.jsonb('stats').notNullable().defaultTo(
      knex.raw(`'{"health":100,"attack":10,"defense":5,"agility":5,"magic":5}'::jsonb`),
    );
    t.jsonb('equipment').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    t.string('current_region_id', 64).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.index(['player_id']);
    t.index(['level']);
    t.unique(['player_id', 'name']);
  });

  // ---------------- ITEMS (static catalog, keyed by content id) ----------------
  await knex.schema.createTable('items', (t) => {
    t.string('id', 64).primary(); // e.g. 'iron_sword'
    t.string('name', 64).notNullable();
    t.text('description').notNullable();
    t.enu('kind', ['weapon', 'armor', 'trinket', 'consumable', 'material', 'quest'], {
      useNative: true,
      enumName: 'item_kind',
    }).notNullable();
    t.enu('rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary'], {
      useNative: true,
      enumName: 'item_rarity',
    }).notNullable();
    t.enu('slot', ['main_hand', 'off_hand', 'head', 'chest', 'legs', 'feet', 'trinket'], {
      useNative: true,
      enumName: 'equipment_slot',
    }).nullable();
    t.jsonb('stats').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    t.integer('stack_max').notNullable().defaultTo(1);
    t.integer('sell_price').notNullable().defaultTo(0);
    t.integer('level_req').notNullable().defaultTo(1);
    t.boolean('tradeable').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['kind']);
    t.index(['rarity']);
  });

  // ---------------- INVENTORIES ----------------
  await knex.schema.createTable('inventories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('character_id').notNullable().unique()
      .references('id').inTable('characters').onDelete('CASCADE');
    t.integer('size').notNullable().defaultTo(40);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('inventory_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('inventory_id').notNullable()
      .references('id').inTable('inventories').onDelete('CASCADE');
    t.string('item_id', 64).notNullable().references('id').inTable('items');
    t.integer('quantity').notNullable().defaultTo(1);
    t.boolean('is_equipped').notNullable().defaultTo(false);
    t.jsonb('instance_data').notNullable().defaultTo(knex.raw(`'{}'::jsonb`)); // rolls, prefixes
    t.timestamp('acquired_at').notNullable().defaultTo(knex.fn.now());
    t.index(['inventory_id']);
    t.index(['item_id']);
    t.index(['inventory_id', 'item_id']);
  });

  // ---------------- WORLD: REGIONS & ENEMIES (static) ----------------
  await knex.schema.createTable('regions', (t) => {
    t.string('id', 64).primary(); // e.g. 'greenvale_plains'
    t.string('name', 64).notNullable();
    t.text('description').notNullable();
    t.integer('level_min').notNullable().defaultTo(1);
    t.integer('level_max').notNullable().defaultTo(10);
    t.jsonb('enemy_pool').notNullable().defaultTo(knex.raw(`'[]'::jsonb`)); // [{enemy_id, weight}]
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('enemies', (t) => {
    t.string('id', 64).primary(); // e.g. 'wolf'
    t.string('name', 64).notNullable();
    t.enu('archetype', ['beast', 'humanoid', 'undead', 'elemental'], {
      useNative: true,
      enumName: 'enemy_archetype',
    }).notNullable();
    t.integer('level').notNullable().defaultTo(1);
    t.jsonb('stats').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    t.jsonb('loot_table').notNullable().defaultTo(knex.raw(`'[]'::jsonb`)); // [{item_id, weight, qty_min, qty_max}]
    t.integer('xp_reward').notNullable().defaultTo(10);
    t.integer('gold_reward_min').notNullable().defaultTo(0);
    t.integer('gold_reward_max').notNullable().defaultTo(5);
    t.index(['archetype']);
    t.index(['level']);
  });

  // ---------------- QUESTS ----------------
  await knex.schema.createTable('quests', (t) => {
    t.string('id', 64).primary(); // 'wolf_culling_1'
    t.string('name', 128).notNullable();
    t.text('description').notNullable();
    t.enu('kind', ['kill', 'gather', 'explore', 'deliver'], {
      useNative: true,
      enumName: 'quest_kind',
    }).notNullable();
    t.enu('cadence', ['one_time', 'daily', 'weekly', 'seasonal'], {
      useNative: true,
      enumName: 'quest_cadence',
    }).notNullable().defaultTo('one_time');
    t.string('region_id', 64).nullable().references('id').inTable('regions');
    t.integer('level_req').notNullable().defaultTo(1);
    t.jsonb('requirements').notNullable().defaultTo(knex.raw(`'{}'::jsonb`)); // {target_type, target_id, count}
    t.jsonb('rewards').notNullable().defaultTo(knex.raw(`'{}'::jsonb`)); // {gold, xp, items: [{item_id, qty}]}
    t.string('season_id', 64).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.index(['region_id']);
    t.index(['cadence']);
    t.index(['season_id']);
  });

  await knex.schema.createTable('quest_progress', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('character_id').notNullable()
      .references('id').inTable('characters').onDelete('CASCADE');
    t.string('quest_id', 64).notNullable().references('id').inTable('quests');
    t.enu('status', ['accepted', 'in_progress', 'ready_to_turn_in', 'completed', 'abandoned'], {
      useNative: true,
      enumName: 'quest_status',
    }).notNullable().defaultTo('accepted');
    t.jsonb('progress').notNullable().defaultTo(knex.raw(`'{"count":0}'::jsonb`));
    t.timestamp('accepted_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.timestamp('resets_at').nullable(); // for daily/weekly
    t.index(['character_id']);
    t.index(['character_id', 'status']);
    t.unique(['character_id', 'quest_id', 'accepted_at']);
  });

  // ---------------- COMBAT ----------------
  await knex.schema.createTable('combat_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('character_id').notNullable()
      .references('id').inTable('characters').onDelete('CASCADE');
    t.string('enemy_id', 64).notNullable().references('id').inTable('enemies');
    t.string('region_id', 64).notNullable().references('id').inTable('regions');
    t.enu('outcome', ['victory', 'defeat', 'fled'], {
      useNative: true,
      enumName: 'combat_outcome',
    }).notNullable();
    t.integer('rounds').notNullable().defaultTo(0);
    t.integer('damage_dealt').notNullable().defaultTo(0);
    t.integer('damage_taken').notNullable().defaultTo(0);
    t.integer('xp_gained').notNullable().defaultTo(0);
    t.integer('gold_gained').notNullable().defaultTo(0);
    t.jsonb('loot').notNullable().defaultTo(knex.raw(`'[]'::jsonb`));
    t.timestamp('started_at').notNullable();
    t.timestamp('ended_at').notNullable().defaultTo(knex.fn.now());
    t.index(['character_id']);
    t.index(['region_id']);
    t.index(['ended_at']);
  });

  // ---------------- GUILDS ----------------
  await knex.schema.createTable('guilds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 32).notNullable().unique();
    t.string('tag', 6).notNullable().unique();
    t.text('description').nullable();
    t.uuid('owner_player_id').notNullable().references('id').inTable('players');
    t.integer('level').notNullable().defaultTo(1);
    t.integer('member_cap').notNullable().defaultTo(30);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('guild_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('guild_id').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    t.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    t.enu('rank', ['leader', 'officer', 'member'], { useNative: true, enumName: 'guild_rank' })
      .notNullable().defaultTo('member');
    t.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['guild_id', 'player_id']);
    t.unique(['player_id']); // one guild at a time
    t.index(['guild_id']);
  });

  // ---------------- CHAT / MESSAGES ----------------
  await knex.schema.createTable('messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('channel', ['global', 'guild', 'dm'], { useNative: true, enumName: 'chat_channel' })
      .notNullable();
    t.string('channel_id', 64).nullable(); // guild_id, dm thread id
    t.uuid('sender_player_id').notNullable().references('id').inTable('players');
    t.uuid('recipient_player_id').nullable().references('id').inTable('players'); // dm
    t.text('body').notNullable();
    t.boolean('is_moderated').notNullable().defaultTo(false);
    t.timestamp('sent_at').notNullable().defaultTo(knex.fn.now());
    t.index(['channel', 'channel_id', 'sent_at']);
    t.index(['recipient_player_id', 'sent_at']);
  });

  await knex.schema.createTable('chat_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.uuid('reporter_player_id').notNullable().references('id').inTable('players');
    t.string('reason', 32).notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ---------------- WORLD EVENTS ----------------
  await knex.schema.createTable('world_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('template_id', 64).notNullable(); // 'goblin_invasion'
    t.string('name', 64).notNullable();
    t.text('description').notNullable();
    t.enu('status', ['scheduled', 'active', 'ended'], {
      useNative: true,
      enumName: 'world_event_status',
    }).notNullable().defaultTo('scheduled');
    t.bigInteger('progress').notNullable().defaultTo(0);
    t.bigInteger('progress_goal').notNullable();
    t.string('region_id', 64).nullable().references('id').inTable('regions');
    t.string('season_id', 64).nullable();
    t.jsonb('rewards').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['status']);
    t.index(['ends_at']);
  });

  await knex.schema.createTable('world_event_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_id').notNullable()
      .references('id').inTable('world_events').onDelete('CASCADE');
    t.uuid('character_id').notNullable()
      .references('id').inTable('characters').onDelete('CASCADE');
    t.integer('contribution').notNullable().defaultTo(0);
    t.boolean('rewarded').notNullable().defaultTo(false);
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['event_id', 'character_id']);
    t.index(['event_id']);
  });

  // ---------------- MARKETPLACE ----------------
  await knex.schema.createTable('listings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('seller_player_id').notNullable().references('id').inTable('players');
    t.uuid('inventory_item_id').notNullable()
      .references('id').inTable('inventory_items').onDelete('CASCADE');
    t.string('item_id', 64).notNullable().references('id').inTable('items'); // denorm for index
    t.integer('quantity').notNullable();
    t.integer('price_gold').notNullable();
    t.enu('status', ['active', 'sold', 'cancelled', 'expired'], {
      useNative: true,
      enumName: 'listing_status',
    }).notNullable().defaultTo('active');
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['item_id', 'status']);
    t.index(['seller_player_id']);
    t.index(['status', 'expires_at']);
  });

  await knex.schema.createTable('transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('listing_id').notNullable().references('id').inTable('listings');
    t.uuid('buyer_player_id').notNullable().references('id').inTable('players');
    t.uuid('seller_player_id').notNullable().references('id').inTable('players');
    t.string('item_id', 64).notNullable();
    t.integer('quantity').notNullable();
    t.integer('total_gold').notNullable();
    t.integer('fee_gold').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['buyer_player_id']);
    t.index(['seller_player_id']);
  });

  // ---------------- LEADERBOARDS (persistent snapshot; live = redis ZSET) ----------------
  await knex.schema.createTable('leaderboards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('board', 32).notNullable(); // 'xp_total', 'gold_total', 'event:<id>'
    t.string('season_id', 64).nullable();
    t.jsonb('snapshot').notNullable(); // [{rank, character_id, score, name}]
    t.timestamp('snapshotted_at').notNullable().defaultTo(knex.fn.now());
    t.index(['board', 'snapshotted_at']);
  });

  // ---------------- NOTIFICATIONS ----------------
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    t.string('kind', 32).notNullable();
    t.jsonb('payload').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    t.boolean('read').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['player_id', 'read', 'created_at']);
  });

  // ---------------- ANALYTICS (append-only) ----------------
  await knex.schema.createTable('events_analytics', (t) => {
    t.bigIncrements('id').primary();
    t.uuid('user_id').nullable();
    t.uuid('character_id').nullable();
    t.string('name', 64).notNullable();
    t.jsonb('properties').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    t.string('session_id', 64).nullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.index(['name', 'occurred_at']);
    t.index(['user_id', 'occurred_at']);
  });

  // ---------------- AUDIT LOG ----------------
  await knex.schema.createTable('audit_log', (t) => {
    t.bigIncrements('id').primary();
    t.uuid('actor_user_id').nullable();
    t.uuid('character_id').nullable();
    t.string('action', 64).notNullable();
    t.jsonb('before').nullable();
    t.jsonb('after').nullable();
    t.string('request_id', 64).nullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.index(['actor_user_id', 'occurred_at']);
    t.index(['action', 'occurred_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse dependency order
  for (const tbl of [
    'audit_log',
    'events_analytics',
    'notifications',
    'leaderboards',
    'transactions',
    'listings',
    'world_event_participants',
    'world_events',
    'chat_reports',
    'messages',
    'guild_members',
    'guilds',
    'combat_logs',
    'quest_progress',
    'quests',
    'enemies',
    'regions',
    'inventory_items',
    'inventories',
    'items',
    'characters',
    'players',
    'refresh_tokens',
    'users',
  ]) {
    await knex.schema.dropTableIfExists(tbl);
  }
  for (const en of [
    'user_role', 'character_class', 'item_kind', 'item_rarity', 'equipment_slot',
    'enemy_archetype', 'quest_kind', 'quest_cadence', 'quest_status',
    'combat_outcome', 'guild_rank', 'chat_channel', 'world_event_status', 'listing_status',
  ]) {
    await knex.raw(`DROP TYPE IF EXISTS "${en}"`);
  }
}
