import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ItemsModule } from '../items/items.module';
import { RegionsModule } from '../regions/regions.module';

@Module({
  imports: [ItemsModule, RegionsModule],
  controllers: [AdminController],
})
export class AdminModule {}
