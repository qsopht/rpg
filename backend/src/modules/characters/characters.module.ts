import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { CharactersRepository } from './characters.repository';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [PlayersModule],
  controllers: [CharactersController],
  providers: [CharactersService, CharactersRepository],
  exports: [CharactersService, CharactersRepository],
})
export class CharactersModule {}
