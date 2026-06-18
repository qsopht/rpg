import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { ItemsModule } from '../items/items.module';
import { CharactersModule } from '../characters/characters.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [ItemsModule, CharactersModule, PlayersModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
