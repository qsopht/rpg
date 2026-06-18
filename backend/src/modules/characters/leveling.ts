/**
 * Leveling curve.
 *  xpForLevel(n) = total XP required to be exactly level n.
 *  curve: 50 * (n-1)^1.6   (cumulative)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level - 1, 1.6));
}

export function levelForXp(totalXp: number): number {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= totalXp && lvl < 99) lvl++;
  return lvl;
}

/** Skill points granted on each level-up. */
export const SKILL_POINTS_PER_LEVEL = 2;

/** Stat growth per level, per class. Applied as base; equipment/skills layer on top. */
export const LEVEL_UP_STATS: Record<
  'warrior' | 'ranger' | 'mage',
  { health: number; attack: number; defense: number; agility: number; magic: number }
> = {
  warrior: { health: 12, attack: 2, defense: 2, agility: 0, magic: 0 },
  ranger:  { health: 8,  attack: 2, defense: 1, agility: 2, magic: 0 },
  mage:    { health: 7,  attack: 1, defense: 1, agility: 0, magic: 3 },
};

/** Starting stats per class. */
export const STARTING_STATS: typeof LEVEL_UP_STATS = {
  warrior: { health: 120, attack: 12, defense: 8, agility: 4, magic: 0 },
  ranger:  { health: 95,  attack: 11, defense: 5, agility: 9, magic: 2 },
  mage:    { health: 80,  attack: 6,  defense: 4, agility: 4, magic: 12 },
};
