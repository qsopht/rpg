import { Injectable, NotFoundException } from '@nestjs/common';
import { PlayersRepository, PlayerRow } from './players.repository';

@Injectable()
export class PlayersService {
  constructor(private readonly repo: PlayersRepository) {}

  async getByUserId(userId: string): Promise<PlayerRow> {
    const p = await this.repo.findByUserId(userId);
    if (!p) throw new NotFoundException({ code: 'player_not_found' });
    return p;
  }

  async getPublicProfileByName(displayName: string) {
    const p = await this.repo.findByDisplayName(displayName);
    if (!p) throw new NotFoundException({ code: 'player_not_found' });
    return {
      id: p.id,
      displayName: p.display_name,
      avatarId: p.avatar_id,
      bio: p.bio,
      // gold/gems not exposed publicly
    };
  }

  async updateProfile(userId: string, patch: { avatarId?: string; bio?: string }) {
    const me = await this.getByUserId(userId);
    return this.repo.update(me.id, {
      avatar_id: patch.avatarId ?? me.avatar_id,
      bio: patch.bio ?? me.bio,
    });
  }
}
