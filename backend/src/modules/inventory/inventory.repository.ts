import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface InventoryItemRow {
  id: string;
  inventory_id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
  instance_data: Record<string, unknown>;
  acquired_at: Date;
}

@Injectable()
export class InventoryRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  getByCharacter(characterId: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)('inventories').where({ character_id: characterId }).first();
  }

  listItems(inventoryId: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)<InventoryItemRow>('inventory_items')
      .where({ inventory_id: inventoryId })
      .orderBy('acquired_at', 'desc');
  }

  findStack(inventoryId: string, itemId: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)<InventoryItemRow>('inventory_items')
      .where({ inventory_id: inventoryId, item_id: itemId, is_equipped: false })
      .forUpdate()
      .first();
  }

  insertItem(row: Omit<InventoryItemRow, 'id' | 'acquired_at'>, trx?: Knex.Transaction) {
    return (trx ?? this.db)<InventoryItemRow>('inventory_items').insert(row).returning('*');
  }

  updateQuantity(id: string, quantity: number, trx?: Knex.Transaction) {
    return (trx ?? this.db)('inventory_items').where({ id }).update({ quantity });
  }

  delete(id: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)('inventory_items').where({ id }).delete();
  }

  findItemById(id: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)<InventoryItemRow>('inventory_items')
      .where({ id })
      .forUpdate()
      .first();
  }

  setEquipped(id: string, isEquipped: boolean, trx?: Knex.Transaction) {
    return (trx ?? this.db)('inventory_items').where({ id }).update({ is_equipped: isEquipped });
  }
}
