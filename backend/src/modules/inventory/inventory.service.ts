import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';
import { InventoryRepository } from './inventory.repository';
import { ItemsService } from '../items/items.service';

export interface GrantSpec {
  itemId: string;
  quantity: number;
  /** Per-instance random rolls, prefixes, etc. */
  instanceData?: Record<string, unknown>;
}

@Injectable()
export class InventoryService {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: InventoryRepository,
    private readonly items: ItemsService,
    private readonly bus: EventEmitter2,
  ) {}

  async listByCharacter(characterId: string) {
    const inv = await this.repo.getByCharacter(characterId);
    if (!inv) throw new NotFoundException({ code: 'inventory_not_found' });
    const rows = await this.repo.listItems(inv.id);
    const meta = this.items.byIds(rows.map((r) => r.item_id));
    return rows.map((r) => {
      const item = meta.get(r.item_id);
      return {
        id: r.id,
        itemId: r.item_id,
        name: item?.name ?? r.item_id,
        kind: item?.kind ?? 'material',
        rarity: item?.rarity ?? 'common',
        slot: item?.slot ?? null,
        stats: item?.stats ?? {},
        quantity: r.quantity,
        isEquipped: r.is_equipped,
      };
    });
  }

  /**
   * Grants items to a character's inventory. Stacks where possible. Server-authoritative.
   * Safe to call inside an existing transaction.
   */
  async grant(characterId: string, grants: GrantSpec[], trx?: Knex.Transaction) {
    const run = async (tx: Knex.Transaction) => {
      const inv = await this.repo.getByCharacter(characterId, tx);
      if (!inv) throw new NotFoundException({ code: 'inventory_not_found' });

      const result: { itemId: string; quantity: number; instanceId: string }[] = [];

      for (const g of grants) {
        if (g.quantity <= 0) continue;
        const item = this.items.byId(g.itemId);
        let remaining = g.quantity;

        if (item.stack_max > 1) {
          const existing = await this.repo.findStack(inv.id, g.itemId, tx);
          if (existing) {
            const room = item.stack_max - existing.quantity;
            const add = Math.min(room, remaining);
            if (add > 0) {
              await this.repo.updateQuantity(existing.id, existing.quantity + add, tx);
              remaining -= add;
              result.push({ itemId: g.itemId, quantity: add, instanceId: existing.id });
            }
          }
        }

        while (remaining > 0) {
          const chunk = item.stack_max > 1 ? Math.min(item.stack_max, remaining) : 1;
          const [row] = await this.repo.insertItem(
            {
              inventory_id: inv.id,
              item_id: g.itemId,
              quantity: chunk,
              is_equipped: false,
              instance_data: g.instanceData ?? {},
            },
            tx,
          );
          result.push({ itemId: g.itemId, quantity: chunk, instanceId: row.id });
          remaining -= chunk;
        }
      }

      this.bus.emit('inventory.granted', { characterId, grants: result });
      return result;
    };

    return trx ? run(trx) : this.db.transaction(run);
  }

  /** Consume N of an item from a character's inventory across stacks. */
  async consume(characterId: string, itemId: string, quantity: number, trx?: Knex.Transaction) {
    if (quantity <= 0) throw new BadRequestException({ code: 'quantity_must_be_positive' });
    const run = async (tx: Knex.Transaction) => {
      const inv = await this.repo.getByCharacter(characterId, tx);
      if (!inv) throw new NotFoundException({ code: 'inventory_not_found' });

      const rows = await tx<{ id: string; quantity: number }>('inventory_items')
        .where({ inventory_id: inv.id, item_id: itemId, is_equipped: false })
        .orderBy('acquired_at', 'asc')
        .forUpdate();

      let remaining = quantity;
      for (const row of rows) {
        if (remaining <= 0) break;
        const take = Math.min(row.quantity, remaining);
        const left = row.quantity - take;
        remaining -= take;
        if (left === 0) await this.repo.delete(row.id, tx);
        else await this.repo.updateQuantity(row.id, left, tx);
      }
      if (remaining > 0) {
        throw new BadRequestException({ code: 'insufficient_items', missing: remaining });
      }
      this.bus.emit('inventory.consumed', { characterId, itemId, quantity });
    };
    return trx ? run(trx) : this.db.transaction(run);
  }

  async equip(characterId: string, inventoryItemId: string) {
    return this.db.transaction(async (tx) => {
      const inv = await this.repo.getByCharacter(characterId, tx);
      if (!inv) throw new NotFoundException({ code: 'inventory_not_found' });
      const row = await this.repo.findItemById(inventoryItemId, tx);
      if (!row || row.inventory_id !== inv.id) {
        throw new NotFoundException({ code: 'item_not_in_inventory' });
      }
      const item = this.items.byId(row.item_id);
      if (!item.slot) throw new BadRequestException({ code: 'item_not_equippable' });

      const character = await tx('characters').where({ id: characterId }).forUpdate().first();
      if (!character) throw new NotFoundException({ code: 'character_not_found' });
      if (character.level < item.level_req) {
        throw new BadRequestException({ code: 'level_too_low', required: item.level_req });
      }

      // Unequip the current item in that slot, if any.
      const equipment: Record<string, string> = character.equipment ?? {};
      const prevId = equipment[item.slot];
      if (prevId) await this.repo.setEquipped(prevId, false, tx);

      await this.repo.setEquipped(row.id, true, tx);
      equipment[item.slot] = row.id;
      await tx('characters').where({ id: characterId }).update({ equipment });

      this.bus.emit('inventory.equipped', { characterId, slot: item.slot, itemId: row.item_id });
      return { slot: item.slot, equippedInstanceId: row.id };
    });
  }

  async unequip(characterId: string, slot: string) {
    return this.db.transaction(async (tx) => {
      const character = await tx('characters').where({ id: characterId }).forUpdate().first();
      if (!character) throw new NotFoundException({ code: 'character_not_found' });
      const equipment: Record<string, string> = character.equipment ?? {};
      const inventoryItemId = equipment[slot];
      if (!inventoryItemId) return { slot, equippedInstanceId: null };
      await this.repo.setEquipped(inventoryItemId, false, tx);
      delete equipment[slot];
      await tx('characters').where({ id: characterId }).update({ equipment });
      this.bus.emit('inventory.unequipped', { characterId, slot });
      return { slot, equippedInstanceId: null };
    });
  }

  /** Count of a given item across non-equipped stacks. Used by quest gather targets. */
  async countItem(characterId: string, itemId: string): Promise<number> {
    const inv = await this.repo.getByCharacter(characterId);
    if (!inv) return 0;
    const rows = await this.db<{ quantity: number }>('inventory_items')
      .where({ inventory_id: inv.id, item_id: itemId, is_equipped: false })
      .select('quantity');
    return rows.reduce((s, r) => s + r.quantity, 0);
  }
}
