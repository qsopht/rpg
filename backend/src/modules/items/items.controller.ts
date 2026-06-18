import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  list() {
    return this.items.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.items.byId(id);
  }
}
