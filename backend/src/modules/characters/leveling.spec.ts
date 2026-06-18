import { levelForXp, xpForLevel } from './leveling';

describe('leveling curve', () => {
  it('xpForLevel(1) is 0', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('is monotonically increasing', () => {
    let prev = 0;
    for (let l = 2; l <= 50; l++) {
      const x = xpForLevel(l);
      expect(x).toBeGreaterThan(prev);
      prev = x;
    }
  });

  it('round-trips through levelForXp', () => {
    for (let l = 1; l <= 30; l++) {
      expect(levelForXp(xpForLevel(l))).toBe(l);
      expect(levelForXp(xpForLevel(l + 1) - 1)).toBe(l);
    }
  });
});
