import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export type ItemKind = 'weapon' | 'armor' | 'trinket' | 'consumable' | 'material' | 'quest';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot =
  | 'main_hand'
  | 'off_hand'
  | 'head'
  | 'chest'
  | 'legs'
  | 'feet'
  | 'trinket';

export interface ItemRow {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  rarity: Rarity;
  slot: EquipmentSlot | null;
  stats: Record<string, number>;
  stack_max: number;
  sell_price: number;
  level_req: number;
  tradeable: boolean;
}

@Injectable()
export class ItemsRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  all() {
    return this.db<ItemRow>('items').select('*');
  }

  byId(id: string) {
    return this.db<ItemRow>('items').where({ id }).first();
  }

  byIds(ids: readonly string[]) {
    if (ids.length === 0) return Promise.resolve([] as ItemRow[]);
    return this.db<ItemRow>('items').whereIn('id', ids as string[]);
  }
}
