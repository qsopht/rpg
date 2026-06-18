import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface ListingRow {
  id: string;
  seller_player_id: string;
  inventory_item_id: string;
  item_id: string;
  quantity: number;
  price_gold: number;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  expires_at: Date;
  created_at: Date;
}

@Injectable()
export class MarketplaceRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  async insert(row: Omit<ListingRow, 'id' | 'created_at'>, trx?: Knex.Transaction) {
    const [r] = await (trx ?? this.db)<ListingRow>('listings').insert(row).returning('*');
    return r;
  }

  byId(id: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)<ListingRow>('listings').where({ id }).forUpdate().first();
  }

  search(params: { itemId?: string; maxPrice?: number; limit?: number }) {
    const q = this.db<ListingRow>('listings').where({ status: 'active' }).limit(params.limit ?? 50)
      .orderBy('price_gold', 'asc');
    if (params.itemId) q.andWhere({ item_id: params.itemId });
    if (params.maxPrice) q.andWhere('price_gold', '<=', params.maxPrice);
    return q;
  }

  setStatus(id: string, status: ListingRow['status'], trx?: Knex.Transaction) {
    return (trx ?? this.db)('listings').where({ id }).update({ status });
  }

  insertTransaction(row: {
    listing_id: string;
    buyer_player_id: string;
    seller_player_id: string;
    item_id: string;
    quantity: number;
    total_gold: number;
    fee_gold: number;
  }, trx?: Knex.Transaction) {
    return (trx ?? this.db)('transactions').insert(row).returning('*');
  }

  mySellListings(playerId: string) {
    return this.db<ListingRow>('listings').where({ seller_player_id: playerId }).orderBy('created_at', 'desc');
  }
}
