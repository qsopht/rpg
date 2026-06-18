import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { KNEX_TOKEN } from '../../database/database.module';
import { REDIS_TOKEN } from '../../redis/redis.module';
import { CharactersService } from '../characters/characters.service';
import { CharactersRepository } from '../characters/characters.repository';
import { RegionsService } from '../regions/regions.service';
import { InventoryService } from '../inventory/inventory.service';
import { PlayersRepository } from '../players/players.repository';
import { ItemsService } from '../items/items.service';
import { CombatRepository } from './combat.repository';
import { CombatActionDto, StartEncounterDto } from './dto/combat.dto';
import {
  CombatStats,
  fleeChance,
  rollAttack,
  rollGold,
  rollLoot,
  rollSkill,
  statsFromCharacter,
  statsFromEnemy,
} from './combat-formulas';

const ENCOUNTER_TTL_SECONDS = 15 * 60;
const MAX_ROUNDS = 60;

interface EncounterState {
  id: string;
  characterId: string;
  regionId: string;
  enemyId: string;
  player: CombatStats;
  enemy: CombatStats;
  round: number;
  damageDealt: number;
  damageTaken: number;
  startedAt: string;
  /** Set when defending so the next incoming attack is halved. */
  playerDefending?: boolean;
}

export interface ResolveStep {
  round: number;
  playerAction: string;
  playerDamage: number;
  enemyAction: string;
  enemyDamage: number;
  playerHp: number;
  enemyHp: number;
}

@Injectable()
export class CombatService {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly characters: CharactersService,
    private readonly charsRepo: CharactersRepository,
    private readonly regions: RegionsService,
    private readonly inventory: InventoryService,
    private readonly playersRepo: PlayersRepository,
    private readonly items: ItemsService,
    private readonly logs: CombatRepository,
    private readonly bus: EventEmitter2,
  ) {}

  async start(userId: string, dto: StartEncounterDto) {
    const char = await this.characters.get(userId, dto.characterId);
    const region = this.regions.region(dto.regionId);
    if (char.level < region.level_min - 2) {
      throw new BadRequestException({ code: 'region_too_high_level' });
    }

    const enemy = this.regions.rollEnemyForRegion(dto.regionId);
    const enc: EncounterState = {
      id: uuid(),
      characterId: char.id,
      regionId: region.id,
      enemyId: enemy.id,
      player: statsFromCharacter(char.stats),
      enemy: statsFromEnemy(enemy),
      round: 0,
      damageDealt: 0,
      damageTaken: 0,
      startedAt: new Date().toISOString(),
    };
    await this.saveEncounter(enc);

    return {
      encounterId: enc.id,
      enemy: {
        id: enemy.id,
        name: enemy.name,
        level: enemy.level,
        archetype: enemy.archetype,
        stats: enc.enemy,
      },
      player: enc.player,
      regionId: region.id,
    };
  }

  async submitAction(userId: string, encounterId: string, dto: CombatActionDto) {
    const enc = await this.loadEncounter(encounterId);
    if (!enc) throw new NotFoundException({ code: 'encounter_not_found_or_expired' });
    const char = await this.characters.get(userId, enc.characterId);
    if (char.id !== enc.characterId) throw new BadRequestException({ code: 'not_your_encounter' });

    const step: ResolveStep = {
      round: enc.round + 1,
      playerAction: dto.action,
      playerDamage: 0,
      enemyAction: 'attack',
      enemyDamage: 0,
      playerHp: enc.player.health,
      enemyHp: enc.enemy.health,
    };
    enc.round = step.round;

    // ---- Player turn ----
    let playerFlees = false;
    if (dto.action === 'attack') {
      step.playerDamage = rollAttack(enc.player, enc.enemy);
      enc.enemy.health = Math.max(0, enc.enemy.health - step.playerDamage);
      enc.damageDealt += step.playerDamage;
    } else if (dto.action === 'skill') {
      const skill = dto.skillId ?? defaultSkillForClass(char.class);
      step.playerDamage = rollSkill(enc.player, enc.enemy, skill);
      enc.enemy.health = Math.max(0, enc.enemy.health - step.playerDamage);
      enc.damageDealt += step.playerDamage;
      step.playerAction = `skill:${skill}`;
    } else if (dto.action === 'defend') {
      enc.playerDefending = true;
    } else if (dto.action === 'use_item') {
      if (!dto.itemId) throw new BadRequestException({ code: 'item_id_required' });
      await this.useItem(enc, dto.itemId);
      step.playerAction = `use_item:${dto.itemId}`;
    } else if (dto.action === 'flee') {
      playerFlees = Math.random() < fleeChance(enc.player, enc.enemy);
      step.playerAction = playerFlees ? 'flee:success' : 'flee:fail';
    }

    // ---- Win check ----
    if (enc.enemy.health <= 0) {
      step.enemyHp = 0;
      const rewards = await this.commitVictory(char.id, enc);
      await this.deleteEncounter(enc.id);
      return { step, status: 'victory' as const, encounterId: enc.id, rewards };
    }
    if (playerFlees) {
      await this.commitFlee(char.id, enc);
      await this.deleteEncounter(enc.id);
      return { step, status: 'fled' as const, encounterId: enc.id };
    }

    // ---- Enemy turn ----
    let enemyDmg = rollAttack(enc.enemy, enc.player);
    if (enc.playerDefending) {
      enemyDmg = Math.max(1, Math.round(enemyDmg * 0.5));
      enc.playerDefending = false;
    }
    step.enemyDamage = enemyDmg;
    enc.player.health = Math.max(0, enc.player.health - enemyDmg);
    enc.damageTaken += enemyDmg;
    step.playerHp = enc.player.health;
    step.enemyHp = enc.enemy.health;

    if (enc.player.health <= 0) {
      await this.commitDefeat(char.id, enc);
      await this.deleteEncounter(enc.id);
      return { step, status: 'defeat' as const, encounterId: enc.id };
    }

    if (enc.round >= MAX_ROUNDS) {
      await this.commitFlee(char.id, enc);
      await this.deleteEncounter(enc.id);
      return { step, status: 'fled' as const, reason: 'round_limit', encounterId: enc.id };
    }

    await this.saveEncounter(enc);
    return { step, status: 'ongoing' as const, encounterId: enc.id, state: { player: enc.player, enemy: enc.enemy } };
  }

  recentLogs(characterId: string) {
    return this.logs.recentByCharacter(characterId);
  }

  // ----- private -----

  private encKey(id: string) {
    return `combat:enc:${id}`;
  }

  private async saveEncounter(enc: EncounterState) {
    await this.redis.set(this.encKey(enc.id), JSON.stringify(enc), 'EX', ENCOUNTER_TTL_SECONDS);
  }

  private async loadEncounter(id: string): Promise<EncounterState | null> {
    const raw = await this.redis.get(this.encKey(id));
    return raw ? (JSON.parse(raw) as EncounterState) : null;
  }

  private async deleteEncounter(id: string) {
    await this.redis.del(this.encKey(id));
  }

  private async useItem(enc: EncounterState, itemId: string) {
    const item = this.items.byId(itemId);
    if (item.kind !== 'consumable') throw new BadRequestException({ code: 'not_consumable' });
    // Consume one
    await this.inventory.consume(enc.characterId, itemId, 1);
    const heal = Number(item.stats?.heal ?? 0);
    if (heal > 0) {
      enc.player.health = Math.min(enc.player.maxHealth, enc.player.health + heal);
    }
  }

  private async commitVictory(characterId: string, enc: EncounterState) {
    const enemy = this.regions.enemy(enc.enemyId);
    const loot = rollLoot(enemy.loot_table);
    const gold = rollGold(enemy.gold_reward_min, enemy.gold_reward_max);
    const xp = enemy.xp_reward;

    const char = await this.charsRepo.findById(characterId);
    if (!char) throw new NotFoundException({ code: 'character_not_found' });

    await this.db.transaction(async (tx) => {
      if (gold > 0) await this.playersRepo.adjustGold(char.player_id, gold, tx);
      if (loot.length) {
        await this.inventory.grant(
          characterId,
          loot.map((l) => ({ itemId: l.item_id, quantity: l.quantity })),
          tx,
        );
      }
      if (xp > 0) await this.characters.addXp(characterId, xp, tx);
      await this.logs.insertLog(
        {
          character_id: characterId,
          enemy_id: enc.enemyId,
          region_id: enc.regionId,
          outcome: 'victory',
          rounds: enc.round,
          damage_dealt: enc.damageDealt,
          damage_taken: enc.damageTaken,
          xp_gained: xp,
          gold_gained: gold,
          loot,
          started_at: new Date(enc.startedAt),
          ended_at: new Date(),
        },
        tx,
      );
    });

    this.bus.emit('combat.enemy_defeated', { characterId, enemyId: enc.enemyId, count: 1 });
    return { xp, gold, loot };
  }

  private async commitDefeat(characterId: string, enc: EncounterState) {
    await this.logs.insertLog({
      character_id: characterId,
      enemy_id: enc.enemyId,
      region_id: enc.regionId,
      outcome: 'defeat',
      rounds: enc.round,
      damage_dealt: enc.damageDealt,
      damage_taken: enc.damageTaken,
      xp_gained: 0,
      gold_gained: 0,
      loot: [],
      started_at: new Date(enc.startedAt),
      ended_at: new Date(),
    });
  }

  private async commitFlee(characterId: string, enc: EncounterState) {
    await this.logs.insertLog({
      character_id: characterId,
      enemy_id: enc.enemyId,
      region_id: enc.regionId,
      outcome: 'fled',
      rounds: enc.round,
      damage_dealt: enc.damageDealt,
      damage_taken: enc.damageTaken,
      xp_gained: 0,
      gold_gained: 0,
      loot: [],
      started_at: new Date(enc.startedAt),
      ended_at: new Date(),
    });
  }
}

function defaultSkillForClass(c: 'warrior' | 'ranger' | 'mage'): 'power_strike' | 'arcane_bolt' | 'aimed_shot' {
  if (c === 'warrior') return 'power_strike';
  if (c === 'mage') return 'arcane_bolt';
  return 'aimed_shot';
}
