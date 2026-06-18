import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RegionsService } from './regions.service';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  @Get()
  list() {
    return this.regions.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.regions.region(id);
  }
}
