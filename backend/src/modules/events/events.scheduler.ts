import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service';

@Injectable()
export class EventsScheduler {
  private readonly log = new Logger(EventsScheduler.name);
  constructor(private readonly events: EventsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick() {
    try {
      await this.events.settleExpired();
      await this.events.ensureRotation();
    } catch (e) {
      this.log.error('events tick failed', e as Error);
    }
  }
}
