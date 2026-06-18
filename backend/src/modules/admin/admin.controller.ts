import { Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Knex } from 'knex';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ItemsService } from '../items/items.service';
import { RegionsService } from '../regions/regions.service';
import { KNEX_TOKEN } from '../../database/database.module';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly items: ItemsService,
    private readonly regions: RegionsService,
  ) {}

  @Post('content/refresh')
  async refreshContent() {
    await this.items.refresh();
    await this.regions.refresh();
    return { ok: true };
  }

  @Post('users/:userId/ban')
  async ban(@Param('userId') userId: string) {
    await this.db('users').where({ id: userId }).update({ is_banned: true });
    await this.db('refresh_tokens').where({ user_id: userId }).whereNull('revoked_at').update({ revoked_at: this.db.fn.now() });
    return { ok: true };
  }

  @Post('users/:userId/unban')
  async unban(@Param('userId') userId: string) {
    await this.db('users').where({ id: userId }).update({ is_banned: false });
    return { ok: true };
  }
}
