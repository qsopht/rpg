import { Module } from '@nestjs/common';
import { CombatController } from './combat.controller';
import { CombatService } from './combat.service';
import { CombatRepository } from './combat.repository';
import { CharactersModule } from '../characters/characters.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RegionsModule } from '../regions/regions.module';
import { PlayersModule } from '../players/players.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [CharactersModule, InventoryModule, RegionsModule, PlayersModule, ItemsModule],
  controllers: [CombatController],
  providers: [CombatService, CombatRepository],
  exports: [CombatService],
})
export class CombatModule {}
