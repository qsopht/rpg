import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceRepository } from './marketplace.repository';
import { PlayersModule } from '../players/players.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [PlayersModule, InventoryModule, ItemsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceRepository],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
