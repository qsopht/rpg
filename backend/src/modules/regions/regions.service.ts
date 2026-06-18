import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EnemyRow, RegionRow, RegionsRepository } from './regions.repository';

@Injectable()
export class RegionsService implements OnModuleInit {
  private regions = new Map<string, RegionRow>();
  private enemies = new Map<string, EnemyRow>();

  constructor(private readonly repo: RegionsRepository) {}

  async onModuleInit() {
    await this.refresh();
  }

  async refresh() {
    const [r, e] = await Promise.all([this.repo.allRegions(), this.repo.allEnemies()]);
    this.regions = new Map(r.map((x) => [x.id, x]));
    this.enemies = new Map(e.map((x) => [x.id, x]));
  }

  list(): RegionRow[] {
    return Array.from(this.regions.values()).sort((a, b) => a.level_min - b.level_min);
  }

  region(id: string): RegionRow {
    const r = this.regions.get(id);
    if (!r) throw new NotFoundException({ code: 'region_not_found' });
    return r;
  }

  enemy(id: string): EnemyRow {
    const r = this.enemies.get(id);
    if (!r) throw new NotFoundException({ code: 'enemy_not_found' });
    return r;
  }

  /** Pick a random enemy weighted by the region's pool. Deterministic rng possible via seed. */
  rollEnemyForRegion(regionId: string, rng: () => number = Math.random): EnemyRow {
    const region = this.region(regionId);
    if (!region.enemy_pool.length) throw new NotFoundException({ code: 'region_has_no_enemies' });
    const total = region.enemy_pool.reduce((s, e) => s + e.weight, 0);
    let pick = rng() * total;
    for (const entry of region.enemy_pool) {
      pick -= entry.weight;
      if (pick <= 0) return this.enemy(entry.enemy_id);
    }
    return this.enemy(region.enemy_pool[region.enemy_pool.length - 1].enemy_id);
  }
}
