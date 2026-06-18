import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';
import { MarketplaceRepository } from './marketplace.repository';
import { PlayersService } from '../players/players.service';
import { PlayersRepository } from '../players/players.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { InventoryService } from '../inventory/inventory.service';
import { ItemsService } from '../items/items.service';

const FEE_RATE = 0.05;
const DEFAULT_LISTING_TTL_HOURS = 48;

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: MarketplaceRepository,
    private readonly players: PlayersService,
    private readonly playersRepo: PlayersRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly inventory: InventoryService,
    private readonly items: ItemsService,
  ) {}

  async list(userId: string, inventoryItemId: string, quantity: number, priceGold: number) {
    if (quantity < 1) throw new BadRequestException({ code: 'invalid_quantity' });
    if (priceGold < 1) throw new BadRequestException({ code: 'invalid_price' });

    const me = await this.players.getByUserId(userId);

    return this.db.transaction(async (tx) => {
      const row = await this.inventoryRepo.findItemById(inventoryItemId, tx);
      if (!row) throw new NotFoundException({ code: 'inventory_item_not_found' });
      const item = this.items.byId(row.item_id);
      if (!item.tradeable) throw new BadRequestException({ code: 'item_not_tradeable' });
      if (row.is_equipped) throw new BadRequestException({ code: 'item_equipped' });
      if (row.quantity < quantity) throw new BadRequestException({ code: 'insufficient_quantity' });

      // Reduce the inventory_item by the quantity; if it goes to zero, the row would be removed,
      // so instead "escrow" by splitting: leave (row.quantity - quantity) in player's inv and
      // create the listing referencing a NEW inv row that is hidden (we model that by deleting
      // the listed portion from inventory and storing item_id+quantity on the listing).
      if (row.quantity === quantity) {
        await this.inventoryRepo.delete(row.id, tx);
      } else {
        await this.inventoryRepo.updateQuantity(row.id, row.quantity - quantity, tx);
      }

      const listing = await this.repo.insert(
        {
          seller_player_id: me.id,
          inventory_item_id: row.id, // historical pointer; may be deleted, OK
          item_id: row.item_id,
          quantity,
          price_gold: priceGold,
          status: 'active',
          expires_at: new Date(Date.now() + DEFAULT_LISTING_TTL_HOURS * 3600 * 1000),
        },
        tx,
      );
      return listing;
    });
  }

  search(itemId?: string, maxPrice?: number) {
    return this.repo.search({ itemId, maxPrice });
  }

  myListings(userId: string) {
    return this.players.getByUserId(userId).then((me) => this.repo.mySellListings(me.id));
  }

  async cancel(userId: string, listingId: string) {
    const me = await this.players.getByUserId(userId);
    return this.db.transaction(async (tx) => {
      const listing = await this.repo.byId(listingId, tx);
      if (!listing) throw new NotFoundException({ code: 'listing_not_found' });
      if (listing.seller_player_id !== me.id) throw new ForbiddenException({ code: 'not_seller' });
      if (listing.status !== 'active') throw new BadRequestException({ code: 'not_active' });

      // Return escrowed items to a character — but the seller's marketplace items don't track which
      // character listed them. We pick the seller's first character that still has an inventory.
      const character = await tx('characters').where({ player_id: me.id }).orderBy('created_at').first();
      if (!character) throw new NotFoundException({ code: 'no_character_to_return_to' });
      await this.inventory.grant(
        character.id,
        [{ itemId: listing.item_id, quantity: listing.quantity }],
        tx,
      );
      await this.repo.setStatus(listingId, 'cancelled', tx);
      return { ok: true };
    });
  }

  async buy(userId: string, listingId: string) {
    const me = await this.players.getByUserId(userId);
    return this.db.transaction(async (tx) => {
      const listing = await this.repo.byId(listingId, tx);
      if (!listing) throw new NotFoundException({ code: 'listing_not_found' });
      if (listing.status !== 'active') throw new BadRequestException({ code: 'not_active' });
      if (listing.expires_at.getTime() < Date.now()) {
        await this.repo.setStatus(listingId, 'expired', tx);
        throw new BadRequestException({ code: 'listing_expired' });
      }
      if (listing.seller_player_id === me.id) throw new BadRequestException({ code: 'cannot_buy_own' });

      const fee = Math.ceil(listing.price_gold * FEE_RATE);
      const net = listing.price_gold - fee;

      await this.playersRepo.adjustGold(me.id, -listing.price_gold, tx);
      await this.playersRepo.adjustGold(listing.seller_player_id, net, tx);

      // Grant item to buyer's first character
      const character = await tx('characters').where({ player_id: me.id }).orderBy('created_at').first();
      if (!character) throw new NotFoundException({ code: 'no_character_to_grant_to' });
      await this.inventory.grant(
        character.id,
        [{ itemId: listing.item_id, quantity: listing.quantity }],
        tx,
      );

      await this.repo.setStatus(listingId, 'sold', tx);
      await this.repo.insertTransaction(
        {
          listing_id: listingId,
          buyer_player_id: me.id,
          seller_player_id: listing.seller_player_id,
          item_id: listing.item_id,
          quantity: listing.quantity,
          total_gold: listing.price_gold,
          fee_gold: fee,
        },
        tx,
      );
      return { ok: true, paid: listing.price_gold, sellerReceived: net, fee };
    });
  }
}
