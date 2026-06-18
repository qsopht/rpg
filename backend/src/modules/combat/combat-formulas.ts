import { EnemyRow } from '../regions/regions.repository';
import { Stats } from '../characters/characters.repository';

export interface CombatStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  agility: number;
  magic: number;
}

export function statsFromCharacter(base: Stats): CombatStats {
  return {
    health: base.health,
    maxHealth: base.health,
    attack: base.attack,
    defense: base.defense,
    agility: base.agility,
    magic: base.magic,
  };
}

export function statsFromEnemy(e: EnemyRow): CombatStats {
  return {
    health: e.stats.health,
    maxHealth: e.stats.health,
    attack: e.stats.attack,
    defense: e.stats.defense,
    agility: e.stats.agility,
    magic: e.stats.magic,
  };
}

/** Plain attack damage. attack vs defense, soft floor of 1. */
export function rollAttack(attacker: CombatStats, defender: CombatStats, rng: () => number = Math.random): number {
  const variance = 0.85 + rng() * 0.3; // 0.85–1.15
  const raw = attacker.attack * variance;
  const dmg = Math.max(1, Math.round(raw - defender.defense * 0.5));
  return dmg;
}

/** Class skill — sample 'power_strike': 1.6x attack, ignores 30% defense, costs 1 turn. */
export function rollSkill(
  attacker: CombatStats,
  defender: CombatStats,
  kind: 'power_strike' | 'arcane_bolt' | 'aimed_shot',
  rng: () => number = Math.random,
): number {
  const variance = 0.9 + rng() * 0.2;
  switch (kind) {
    case 'power_strike': {
      const dmg = Math.max(1, Math.round(attacker.attack * 1.6 * variance - defender.defense * 0.35));
      return dmg;
    }
    case 'arcane_bolt': {
      const dmg = Math.max(1, Math.round((attacker.magic * 2.0 + attacker.attack * 0.3) * variance - defender.defense * 0.2));
      return dmg;
    }
    case 'aimed_shot': {
      const dmg = Math.max(1, Math.round((attacker.attack * 1.3 + attacker.agility * 0.5) * variance - defender.defense * 0.45));
      return dmg;
    }
  }
}

/** Flee chance = 0.4 + (agility advantage)/80, clamp 0.2..0.95. */
export function fleeChance(self: CombatStats, foe: CombatStats): number {
  const base = 0.4 + (self.agility - foe.agility) / 80;
  return Math.max(0.2, Math.min(0.95, base));
}

export function rollLoot(
  table: { item_id: string; weight: number; qty_min: number; qty_max: number }[],
  rng: () => number = Math.random,
): { item_id: string; quantity: number }[] {
  if (!table.length) return [];
  const drops: { item_id: string; quantity: number }[] = [];
  // Two rolls — most fights yield 0–2 drops.
  for (let i = 0; i < 2; i++) {
    const total = table.reduce((s, e) => s + e.weight, 0);
    let pick = rng() * total;
    for (const e of table) {
      pick -= e.weight;
      if (pick <= 0) {
        const qty = e.qty_min + Math.floor(rng() * (e.qty_max - e.qty_min + 1));
        if (qty > 0) {
          const existing = drops.find((d) => d.item_id === e.item_id);
          if (existing) existing.quantity += qty;
          else drops.push({ item_id: e.item_id, quantity: qty });
        }
        break;
      }
    }
  }
  return drops;
}

export function rollGold(min: number, max: number, rng: () => number = Math.random): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}
