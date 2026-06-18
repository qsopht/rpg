import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Knex } from 'knex';
import * as fs from 'fs';
import * as path from 'path';
import { KNEX_TOKEN } from '../../database/database.module';
import { EventsRepository } from './events.repository';
import { CharactersService } from '../characters/characters.service';
import { CharactersRepository } from '../characters/characters.repository';
import { InventoryService } from '../inventory/inventory.service';
import { PlayersRepository } from '../players/players.repository';

interface EventTemplate {
  id: string;
  name: string;
  description: string;
  region_id: string | null;
  progress_goal: number;
  duration_hours: number;
  scoring: { enemy_id: string; per_kill: number };
  rewards: any;
}

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly log = new Logger(EventsService.name);
  private templates: EventTemplate[] = [];

  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: EventsRepository,
    private readonly characters: CharactersService,
    private readonly charsRepo: CharactersRepository,
    private readonly inventory: InventoryService,
    private readonly playersRepo: PlayersRepository,
  ) {}

  onModuleInit() {
    this.loadTemplates();
  }

  private loadTemplates() {
    const p = path.join(resolveContentDir(), 'world_event_templates.json');
    if (fs.existsSync(p)) {
      this.templates = JSON.parse(fs.readFileSync(p, 'utf8'));
      this.log.log(`loaded ${this.templates.length} world event templates from ${p}`);
    } else {
      this.log.warn(`world_event_templates.json not found at ${p}`);
    }
  }

  current() {
    return this.repo.active();
  }

  /** Ensures at least one active event; spawns rotating ones as old ones end. */
  async ensureRotation() {
    const active = await this.repo.active();
    if (active.length >= 1) return;
    if (!this.templates.length) return;

    const t = this.templates[Math.floor(Math.random() * this.templates.length)];
    const starts = new Date();
    const ends = new Date(starts.getTime() + t.duration_hours * 3600 * 1000);
    await this.repo.insert({
      template_id: t.id,
      name: t.name,
      description: t.description,
      status: 'active',
      progress: '0' as any,
      progress_goal: String(t.progress_goal) as any,
      region_id: t.region_id,
      rewards: t.rewards,
      starts_at: starts,
      ends_at: ends,
    });
    this.log.log(`Spawned world event ${t.name}`);
  }

  /** Called by listener when an enemy is defeated; bumps progress for matching events. */
  async onEnemyDefeated(characterId: string, enemyId: string) {
    const active = await this.repo.active();
    for (const ev of active) {
      const t = this.templates.find((x) => x.id === ev.template_id);
      if (!t) continue;
      if (t.scoring.enemy_id !== enemyId) continue;
      const delta = t.scoring.per_kill;
      await this.db.transaction(async (tx) => {
        await this.repo.incrementProgress(ev.id, delta, tx);
        await this.repo.upsertParticipant(ev.id, characterId, delta, tx);
      });
    }
  }

  /** Worker: ends events whose `ends_at` has passed, then distributes rewards. */
  async settleExpired() {
    const expired = await this.repo.expiredActive();
    for (const ev of expired) {
      await this.repo.setStatus(ev.id, 'ended');
      const t = this.templates.find((x) => x.id === ev.template_id);
      if (!t) continue;
      const participants = await this.repo.participantsToReward(ev.id);
      for (const p of participants) {
        const tier = pickTier(t.rewards, p.contribution);
        if (!tier) continue;
        await this.db.transaction(async (tx) => {
          const c = await this.charsRepo.findById(p.character_id, tx);
          if (!c) return;
          if (tier.gold) await this.playersRepo.adjustGold(c.player_id, tier.gold, tx);
          if (tier.xp) await this.characters.addXp(p.character_id, tier.xp, tx);
          if (tier.items?.length) {
            await this.inventory.grant(
              p.character_id,
              tier.items.map((it: any) => ({ itemId: it.item_id, quantity: it.qty })),
              tx,
            );
          }
          await this.repo.markRewarded(p.id, tx);
        });
      }
      this.log.log(`Settled world event ${ev.name}, rewarded ${participants.length} participants`);
    }
  }
}

function pickTier(rewards: any, contribution: number) {
  const ordered = ['tier_3', 'tier_2', 'tier_1'];
  for (const k of ordered) {
    const t = rewards?.[k];
    if (t && contribution >= (t.min_contribution ?? 1)) return t;
  }
  return null;
}

/** See seed.ts — same resolution rules so content/ is found in every layout. */
function resolveContentDir(): string {
  const env = process.env.CONTENT_DIR;
  if (env) return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  const candidates = [
    path.resolve(process.cwd(), 'content'),
    path.resolve(process.cwd(), '../content'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
}
