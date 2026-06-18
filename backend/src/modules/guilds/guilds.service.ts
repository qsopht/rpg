import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';
import { GuildsRepository } from './guilds.repository';
import { PlayersService } from '../players/players.service';

@Injectable()
export class GuildsService {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: GuildsRepository,
    private readonly players: PlayersService,
  ) {}

  async create(userId: string, name: string, tag: string, description?: string) {
    const me = await this.players.getByUserId(userId);
    const existing = await this.repo.membership(me.id);
    if (existing) throw new ConflictException({ code: 'already_in_guild' });

    if (await this.repo.byName(name)) throw new ConflictException({ code: 'name_taken' });
    if (await this.repo.byTag(tag)) throw new ConflictException({ code: 'tag_taken' });

    return this.db.transaction(async (tx) => {
      const guild = await this.repo.createGuild(
        { name, tag: tag.toUpperCase(), description: description ?? null, owner_player_id: me.id },
        tx,
      );
      await this.repo.addMember({ guild_id: guild.id, player_id: me.id, rank: 'leader' }, tx);
      return guild;
    });
  }

  async join(userId: string, guildId: string) {
    const me = await this.players.getByUserId(userId);
    const existing = await this.repo.membership(me.id);
    if (existing) throw new ConflictException({ code: 'already_in_guild' });
    const guild = await this.repo.byId(guildId);
    if (!guild) throw new NotFoundException({ code: 'guild_not_found' });
    const count = await this.repo.countMembers(guildId);
    if (Number(count?.count ?? 0) >= guild.member_cap) {
      throw new ConflictException({ code: 'guild_full' });
    }
    return this.repo.addMember({ guild_id: guildId, player_id: me.id, rank: 'member' });
  }

  async leave(userId: string) {
    const me = await this.players.getByUserId(userId);
    const m = await this.repo.membership(me.id);
    if (!m) throw new BadRequestException({ code: 'not_in_guild' });
    const guild = await this.repo.byId(m.guild_id);
    if (!guild) throw new NotFoundException({ code: 'guild_not_found' });

    if (guild.owner_player_id === me.id) {
      // Leader must promote someone else first
      throw new BadRequestException({ code: 'leader_must_transfer_before_leaving' });
    }
    await this.repo.removeMember(guild.id, me.id);
    return { ok: true };
  }

  async promote(userId: string, targetPlayerId: string, rank: 'officer' | 'member') {
    const me = await this.players.getByUserId(userId);
    const myM = await this.repo.membership(me.id);
    if (!myM) throw new BadRequestException({ code: 'not_in_guild' });
    if (myM.rank !== 'leader') throw new ForbiddenException({ code: 'leader_only' });
    const targetM = await this.repo.membership(targetPlayerId);
    if (!targetM || targetM.guild_id !== myM.guild_id) {
      throw new BadRequestException({ code: 'not_in_same_guild' });
    }
    if (targetPlayerId === me.id) throw new BadRequestException({ code: 'cannot_change_own_rank' });
    return this.repo.setRank(myM.guild_id, targetPlayerId, rank);
  }

  async get(guildId: string) {
    const g = await this.repo.byId(guildId);
    if (!g) throw new NotFoundException({ code: 'guild_not_found' });
    const members = await this.repo.members(guildId);
    return { ...g, members };
  }

  myGuild(userId: string) {
    return this.players.getByUserId(userId).then(async (me) => {
      const m = await this.repo.membership(me.id);
      if (!m) return null;
      return this.get(m.guild_id);
    });
  }

  rankings() {
    return this.repo.topByLevel();
  }
}
