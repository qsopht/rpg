import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';
import { PlayersService } from '../players/players.service';
import { CharactersRepository, CharacterRow, Stats } from './characters.repository';
import { CreateCharacterDto } from './dto/create-character.dto';
import {
  LEVEL_UP_STATS,
  STARTING_STATS,
  SKILL_POINTS_PER_LEVEL,
  levelForXp,
  xpForLevel,
} from './leveling';

const MAX_CHARACTERS_PER_PLAYER = 3;

@Injectable()
export class CharactersService {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: CharactersRepository,
    private readonly players: PlayersService,
    private readonly bus: EventEmitter2,
  ) {}

  async list(userId: string): Promise<CharacterRow[]> {
    const me = await this.players.getByUserId(userId);
    return this.repo.listByPlayer(me.id);
  }

  async get(userId: string, id: string): Promise<CharacterRow> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException({ code: 'character_not_found' });
    await this.assertOwned(userId, c);
    return c;
  }

  async create(userId: string, dto: CreateCharacterDto): Promise<CharacterRow> {
    const me = await this.players.getByUserId(userId);
    const owned = await this.repo.listByPlayer(me.id);
    if (owned.length >= MAX_CHARACTERS_PER_PLAYER) {
      throw new ForbiddenException({ code: 'character_slot_limit' });
    }
    if (owned.some((c) => c.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new ConflictException({ code: 'name_taken_on_account' });
    }

    return this.db.transaction(async (trx) => {
      const stats = { ...STARTING_STATS[dto.class] };
      // xp & skill_points come from column defaults (bigint xp is stringified by pg).
      const c = await trx<CharacterRow>('characters')
        .insert({
          player_id: me.id,
          name: dto.name,
          class: dto.class,
          level: 1,
          stats,
          equipment: {},
          current_region_id: 'greenvale_plains',
        })
        .returning('*')
        .then((r) => r[0]);

      await trx('inventories').insert({ character_id: c.id, size: 40 });
      return c;
    });
  }

  /**
   * Grant XP and roll up level changes in a single transaction.
   * Returns the updated character and a summary of any level-ups.
   */
  async addXp(characterId: string, xpDelta: number, trx?: Knex.Transaction) {
    if (xpDelta < 0) throw new BadRequestException({ code: 'xp_must_be_positive' });

    const run = async (tx: Knex.Transaction) => {
      const before = await this.repo.selectForUpdate(characterId, tx);
      if (!before) throw new NotFoundException({ code: 'character_not_found' });

      const newTotalXp = Number(before.xp) + xpDelta;
      const newLevel = levelForXp(newTotalXp);
      const levelsGained = newLevel - before.level;

      const patch: Partial<CharacterRow> = { xp: String(newTotalXp) as any };

      if (levelsGained > 0) {
        const growth = LEVEL_UP_STATS[before.class];
        const stats: Stats = { ...before.stats };
        for (let i = 0; i < levelsGained; i++) {
          stats.health += growth.health;
          stats.attack += growth.attack;
          stats.defense += growth.defense;
          stats.agility += growth.agility;
          stats.magic += growth.magic;
        }
        patch.level = newLevel;
        patch.stats = stats;
        patch.skill_points = before.skill_points + SKILL_POINTS_PER_LEVEL * levelsGained;
      }

      const after = await this.repo.update(characterId, patch, tx);

      if (levelsGained > 0) {
        this.bus.emit('character.level_up', {
          characterId,
          newLevel,
          levelsGained,
        });
      }
      this.bus.emit('character.xp_gained', { characterId, amount: xpDelta, totalXp: newTotalXp });

      return {
        character: after,
        levelsGained,
        xpToNext: xpForLevel(after.level + 1) - Number(after.xp),
      };
    };

    return trx ? run(trx) : this.db.transaction(run);
  }

  async setRegion(userId: string, characterId: string, regionId: string) {
    const c = await this.get(userId, characterId);
    const r = await this.repo.update(characterId, { current_region_id: regionId });
    this.bus.emit('character.entered_region', { characterId, regionId });
    return r;
  }

  private async assertOwned(userId: string, c: CharacterRow): Promise<void> {
    const me = await this.players.getByUserId(userId);
    if (c.player_id !== me.id) throw new ForbiddenException({ code: 'not_owner' });
  }
}
