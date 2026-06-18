import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildsRepository } from './guilds.repository';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [PlayersModule],
  controllers: [GuildsController],
  providers: [GuildsService, GuildsRepository],
  exports: [GuildsService, GuildsRepository],
})
export class GuildsModule {}
