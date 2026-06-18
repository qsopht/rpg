import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  email_verified: boolean;
  role: 'player' | 'admin';
  is_banned: boolean;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  findUserByEmail(email: string): Promise<UserRow | undefined> {
    return this.db<UserRow>('users').where({ email }).first();
  }

  findUserByGoogleSub(sub: string): Promise<UserRow | undefined> {
    return this.db<UserRow>('users').where({ google_sub: sub }).first();
  }

  findUserById(id: string): Promise<UserRow | undefined> {
    return this.db<UserRow>('users').where({ id }).first();
  }

  async insertUser(row: Partial<UserRow>): Promise<UserRow> {
    const [r] = await this.db<UserRow>('users').insert(row).returning('*');
    return r;
  }

  insertRefreshToken(row: Omit<RefreshTokenRow, 'id' | 'revoked_at' | 'replaced_by'>) {
    return this.db('refresh_tokens').insert(row).returning('id');
  }

  findRefreshTokenByHash(hash: string): Promise<RefreshTokenRow | undefined> {
    return this.db<RefreshTokenRow>('refresh_tokens').where({ token_hash: hash }).first();
  }

  revokeFamily(familyId: string): Promise<number> {
    return this.db('refresh_tokens')
      .where({ family_id: familyId })
      .whereNull('revoked_at')
      .update({ revoked_at: this.db.fn.now() });
  }

  markReplaced(oldId: string, newHash: string): Promise<number> {
    return this.db('refresh_tokens')
      .where({ id: oldId })
      .update({ revoked_at: this.db.fn.now(), replaced_by: newHash });
  }

  revokeAllForUser(userId: string): Promise<number> {
    return this.db('refresh_tokens')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .update({ revoked_at: this.db.fn.now() });
  }
}
