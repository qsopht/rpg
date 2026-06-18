import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ItemRow, ItemsRepository } from './items.repository';

@Injectable()
export class ItemsService implements OnModuleInit {
  private cache = new Map<string, ItemRow>();

  constructor(private readonly repo: ItemsRepository) {}

  async onModuleInit() {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const rows = await this.repo.all();
    this.cache = new Map(rows.map((r) => [r.id, r]));
  }

  list(): ItemRow[] {
    return Array.from(this.cache.values());
  }

  byId(id: string): ItemRow {
    const r = this.cache.get(id);
    if (!r) throw new NotFoundException({ code: 'item_not_found', message: `Unknown item ${id}` });
    return r;
  }

  byIds(ids: readonly string[]): Map<string, ItemRow> {
    const out = new Map<string, ItemRow>();
    for (const id of ids) {
      const r = this.cache.get(id);
      if (r) out.set(id, r);
    }
    return out;
  }
}
