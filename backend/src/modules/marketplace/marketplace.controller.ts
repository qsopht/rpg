import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { MarketplaceService } from './marketplace.service';

class ListDto {
  @IsUUID() inventoryItemId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsInt() @Min(1) priceGold!: number;
}

@ApiTags('marketplace')
@ApiBearerAuth()
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly market: MarketplaceService) {}

  @Get()
  search(@Query('itemId') itemId?: string, @Query('maxPrice') maxPrice?: number) {
    return this.market.search(itemId, maxPrice ? Number(maxPrice) : undefined);
  }

  @Get('mine')
  mine(@Req() req: AuthenticatedRequest) {
    return this.market.myListings(req.user.userId);
  }

  @Post('list')
  @Throttle({ default: { ttl: 3600_000, limit: 10 } })
  create(@Req() req: AuthenticatedRequest, @Body() dto: ListDto) {
    return this.market.list(req.user.userId, dto.inventoryItemId, dto.quantity, dto.priceGold);
  }

  @Post(':id/buy')
  buy(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.market.buy(req.user.userId, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.market.cancel(req.user.userId, id);
  }
}
