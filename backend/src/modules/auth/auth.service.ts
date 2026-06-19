import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Knex } from 'knex';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuid } from 'uuid';
import { KNEX_TOKEN } from '../../database/database.module';
import { AuthRepository, UserRow } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionMeta {
  userAgent: string | null;
  ip: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string };
}

@Injectable()
export class AuthService {
  /** Verifier-only client (no secret) for id_token verification in /auth/google. */
  private readonly googleVerifier = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  /** Full OAuth client (with secret) for the server-mediated code flow. */
  private readonly googleOAuth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    this.googleRedirectUri(),
  );

  /** Allowed mobile deep-link schemes that the callback may redirect to. */
  private readonly allowedDeepLinkPrefixes = ['aetheria://'];

  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  private googleRedirectUri(): string {
    const base = process.env.BACKEND_BASE_URL ?? 'http://localhost:3000';
    return `${base}/auth/google/callback`;
  }

  async register(dto: RegisterDto, meta: SessionMeta): Promise<AuthResult> {
    const existing = await this.repo.findUserByEmail(dto.email);
    if (existing) throw new ConflictException({ code: 'email_taken', message: 'Email already registered' });

    const hash = await this.hashPassword(dto.password);

    const { user, displayName } = await this.db.transaction(async (trx) => {
      const [u] = await trx('users')
        .insert({ email: dto.email, password_hash: hash, email_verified: false })
        .returning('*');

      try {
        await trx('players').insert({
          user_id: u.id,
          display_name: dto.displayName,
        });
      } catch (e: any) {
        if (e?.code === '23505') {
          throw new ConflictException({ code: 'display_name_taken', message: 'Display name already taken' });
        }
        throw e;
      }
      return { user: u, displayName: dto.displayName };
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, null, meta);
    return { ...tokens, user: { id: user.id, email: user.email, displayName } };
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<AuthResult> {
    const user = await this.repo.findUserByEmail(dto.email);
    if (!user || !user.password_hash) throw new UnauthorizedException({ code: 'invalid_credentials' });
    if (user.is_banned) throw new ForbiddenException({ code: 'banned' });

    const ok = await argon2.verify(user.password_hash, dto.password);
    if (!ok) throw new UnauthorizedException({ code: 'invalid_credentials' });

    const player = await this.db('players').select('display_name').where({ user_id: user.id }).first();
    const tokens = await this.issueTokens(user.id, user.email, user.role, null, meta);
    return { ...tokens, user: { id: user.id, email: user.email, displayName: player?.display_name ?? '' } };
  }

  async loginWithGoogle(idToken: string, meta: SessionMeta): Promise<AuthResult> {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException({ code: 'google_not_configured' });
    }
    const ticket = await this.googleVerifier
      .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
      .catch(() => null);
    const payload = ticket?.getPayload();
    if (!payload?.sub || !payload.email) throw new UnauthorizedException({ code: 'google_verify_failed' });

    const existing = await this.repo.findUserByGoogleSub(payload.sub);
    let user: UserRow;
    let displayName: string | undefined;

    if (existing) {
      user = existing;
    } else {
      user = await this.db.transaction<UserRow>(async (trx) => {
        const [u] = await trx<UserRow>('users')
          .insert({
            email: payload.email!,
            google_sub: payload.sub!,
            email_verified: true,
          })
          .onConflict('email')
          .merge({ google_sub: payload.sub! })
          .returning('*');

        const dn = await this.uniqueDisplayName(trx, payload.email!.split('@')[0]);
        await trx('players')
          .insert({ user_id: u.id, display_name: dn })
          .onConflict('user_id')
          .merge({ display_name: dn });
        displayName = dn;
        return u;
      });
    }
    if (!displayName) {
      const p = await this.db('players').select('display_name').where({ user_id: user.id }).first();
      displayName = p?.display_name ?? '';
    }
    if (user.is_banned) throw new ForbiddenException({ code: 'banned' });

    const tokens = await this.issueTokens(user.id, user.email, user.role, null, meta);
    return { ...tokens, user: { id: user.id, email: user.email, displayName: displayName ?? '' } };
  }

  async refresh(rawToken: string, meta: SessionMeta): Promise<AuthResult> {
    const hash = sha256(rawToken);
    const row = await this.repo.findRefreshTokenByHash(hash);
    if (!row) throw new UnauthorizedException({ code: 'invalid_refresh' });

    if (row.revoked_at) {
      // Reuse detection: kill the family.
      await this.repo.revokeFamily(row.family_id);
      throw new UnauthorizedException({ code: 'refresh_reuse_detected' });
    }
    if (row.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException({ code: 'refresh_expired' });
    }

    const user = await this.repo.findUserById(row.user_id);
    if (!user || user.is_banned) throw new UnauthorizedException({ code: 'invalid_refresh' });

    const player = await this.db('players').select('display_name').where({ user_id: user.id }).first();
    const tokens = await this.issueTokens(user.id, user.email, user.role, row.family_id, meta);
    await this.repo.markReplaced(row.id, sha256(tokens.refreshToken));
    return { ...tokens, user: { id: user.id, email: user.email, displayName: player?.display_name ?? '' } };
  }

  async logout(userId: string): Promise<void> {
    await this.repo.revokeAllForUser(userId);
  }

  // -------- server-mediated Google OAuth (mobile-friendly) --------

  /** Build the Google OAuth consent URL. State carries the validated deep link. */
  async startGoogleOAuth(deepLinkUri: string): Promise<string> {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new UnauthorizedException({ code: 'google_not_configured' });
    }
    this.assertAllowedDeepLink(deepLinkUri);
    // Sign the deep link into a short-lived JWT and use it as `state` — that's
    // both CSRF protection and a tamper-proof way to pass it through the round trip.
    const state = await this.jwt.signAsync(
      { uri: deepLinkUri },
      { expiresIn: '10m' },
    );
    return this.googleOAuth.generateAuthUrl({
      access_type: 'online',
      include_granted_scopes: true,
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  }

  /** Exchange code → id_token, sign the user in, return the redirect target. */
  async finishGoogleOAuth(
    code: string,
    state: string,
    meta: SessionMeta,
  ): Promise<AuthResult & { redirectUri: string }> {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new UnauthorizedException({ code: 'google_not_configured' });
    }
    let deepLinkUri: string;
    try {
      const decoded = await this.jwt.verifyAsync<{ uri: string }>(state);
      deepLinkUri = decoded.uri;
    } catch {
      throw new UnauthorizedException({ code: 'invalid_state' });
    }
    this.assertAllowedDeepLink(deepLinkUri);

    const { tokens } = await this.googleOAuth.getToken(code).catch((e: any) => {
      throw new UnauthorizedException({ code: 'code_exchange_failed', message: e?.message });
    });
    if (!tokens.id_token) throw new UnauthorizedException({ code: 'no_id_token' });

    const auth = await this.loginWithGoogle(tokens.id_token, meta);
    return { ...auth, redirectUri: deepLinkUri };
  }

  private assertAllowedDeepLink(uri: string): void {
    if (!uri || !this.allowedDeepLinkPrefixes.some((p) => uri.startsWith(p))) {
      throw new UnauthorizedException({ code: 'invalid_deep_link' });
    }
  }

  // -------- private --------

  private async issueTokens(
    userId: string,
    email: string,
    role: 'player' | 'admin',
    familyId: string | null,
    meta: SessionMeta,
  ) {
    const accessToken = await this.jwt.signAsync({ sub: userId, email, role });
    const refreshToken = generateOpaqueToken();
    const refreshHash = sha256(refreshToken);
    await this.repo.insertRefreshToken({
      user_id: userId,
      family_id: familyId ?? uuid(),
      token_hash: refreshHash,
      expires_at: new Date(Date.now() + REFRESH_TTL_MS),
      user_agent: meta.userAgent,
      ip: meta.ip,
    } as any);
    return { accessToken, refreshToken };
  }

  private async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: Number(process.env.ARGON_MEMORY_KIB ?? 65536),
      timeCost: Number(process.env.ARGON_ITERATIONS ?? 3),
      parallelism: Number(process.env.ARGON_PARALLELISM ?? 2),
    });
  }

  private async uniqueDisplayName(trx: Knex.Transaction, seed: string): Promise<string> {
    const cleaned = seed.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 18) || 'Hero';
    for (let i = 0; i < 12; i++) {
      const candidate = i === 0 ? cleaned : `${cleaned}${Math.floor(1000 + Math.random() * 9000)}`;
      const taken = await trx('players').where({ display_name: candidate }).first();
      if (!taken) return candidate;
    }
    throw new ConflictException({ code: 'display_name_unavailable' });
  }
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
