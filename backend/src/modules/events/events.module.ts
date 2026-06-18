import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { EventsScheduler } from './events.scheduler';
import { EventsListener } from './events.listener';
import { CharactersModule } from '../characters/characters.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [CharactersModule, InventoryModule, PlayersModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, EventsScheduler, EventsListener],
  exports: [EventsService],
})
export class EventsModule {}
