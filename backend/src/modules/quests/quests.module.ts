import { Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { QuestsRepository } from './quests.repository';
import { QuestEventsListener } from './quest-events.listener';
import { CharactersModule } from '../characters/characters.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [CharactersModule, InventoryModule, PlayersModule],
  controllers: [QuestsController],
  providers: [QuestsService, QuestsRepository, QuestEventsListener],
  exports: [QuestsService],
})
export class QuestsModule {}
