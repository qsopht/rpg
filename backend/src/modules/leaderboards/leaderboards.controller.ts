import { Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Board, LeaderboardsService } from './leaderboards.service';

const BOARDS = ['xp_total', 'gold_total'] as const;

@ApiTags('leaderboards')
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly lb: LeaderboardsService) {}

  @Get(':board')
  top(
    @Param('board', new ParseEnumPipe(BOARDS as any)) board: Board,
    @Query('limit') limit?: string,
  ) {
    return this.lb.top(board, Math.min(Number(limit ?? 50), 100));
  }

  @Get(':board/rank/:characterId')
  rank(
    @Param('board', new ParseEnumPipe(BOARDS as any)) board: Board,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
  ) {
    return this.lb.rank(board, characterId);
  }
}
