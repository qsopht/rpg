import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface RegionRow {
  id: string;
  name: string;
  description: string;
  level_min: number;
  level_max: number;
  enemy_pool: { enemy_id: string; weight: number }[];
}

export interface EnemyRow {
  id: string;
  name: string;
  archetype: 'beast' | 'humanoid' | 'undead' | 'elemental';
  level: number;
  stats: { health: number; attack: number; defense: number; agility: number; magic: number };
  loot_table: { item_id: string; weight: number; qty_min: number; qty_max: number }[];
  xp_reward: number;
  gold_reward_min: number;
  gold_reward_max: number;
}

@Injectable()
export class RegionsRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  allRegions() { return this.db<RegionRow>('regions').select('*'); }
  regionById(id: string) { return this.db<RegionRow>('regions').where({ id }).first(); }
  allEnemies() { return this.db<EnemyRow>('enemies').select('*'); }
  enemyById(id: string) { return this.db<EnemyRow>('enemies').where({ id }).first(); }
}
