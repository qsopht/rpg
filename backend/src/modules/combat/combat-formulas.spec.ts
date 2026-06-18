import {
  fleeChance,
  rollAttack,
  rollGold,
  rollLoot,
  rollSkill,
  statsFromCharacter,
  statsFromEnemy,
} from './combat-formulas';
import type { EnemyRow } from '../regions/regions.repository';

describe('combat formulas', () => {
  const player = statsFromCharacter({ health: 100, attack: 20, defense: 10, agility: 8, magic: 5 });
  const enemyRow: EnemyRow = {
    id: 'wolf', name: 'Wolf', archetype: 'beast', level: 2,
    stats: { health: 35, attack: 8, defense: 2, agility: 9, magic: 0 },
    loot_table: [{ item_id: 'wolf_pelt', weight: 100, qty_min: 1, qty_max: 1 }],
    xp_reward: 10, gold_reward_min: 1, gold_reward_max: 3,
  };
  const enemy = statsFromEnemy(enemyRow);

  it('attack always deals at least 1', () => {
    const rng = () => 0; // worst variance
    const noDef = { ...enemy, defense: 9999 };
    expect(rollAttack(player, noDef, rng)).toBeGreaterThanOrEqual(1);
  });

  it('attack damage scales with attacker attack', () => {
    const rng = () => 0.5;
    const weak = rollAttack({ ...player, attack: 5 }, enemy, rng);
    const strong = rollAttack({ ...player, attack: 50 }, enemy, rng);
    expect(strong).toBeGreaterThan(weak);
  });

  it('flee chance is clamped within [0.2, 0.95]', () => {
    expect(fleeChance({ ...player, agility: 0 }, { ...enemy, agility: 9999 })).toBeGreaterThanOrEqual(0.2);
    expect(fleeChance({ ...player, agility: 9999 }, { ...enemy, agility: 0 })).toBeLessThanOrEqual(0.95);
  });

  it('rollLoot picks items deterministically with fixed rng', () => {
    const rng = () => 0.01;
    const drops = rollLoot(enemyRow.loot_table, rng);
    expect(drops).toEqual([{ item_id: 'wolf_pelt', quantity: 2 }]);
  });

  it('rollGold respects bounds', () => {
    for (let i = 0; i < 50; i++) {
      const g = rollGold(5, 9);
      expect(g).toBeGreaterThanOrEqual(5);
      expect(g).toBeLessThanOrEqual(9);
    }
  });

  it('rollSkill power_strike beats plain attack on average', () => {
    let attackSum = 0;
    let skillSum = 0;
    const rng = () => 0.5;
    for (let i = 0; i < 50; i++) {
      attackSum += rollAttack(player, enemy, rng);
      skillSum  += rollSkill(player, enemy, 'power_strike', rng);
    }
    expect(skillSum).toBeGreaterThan(attackSum);
  });
});
