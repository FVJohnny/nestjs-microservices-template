import { Injectable } from '@nestjs/common';

@Injectable()
export class EventCounterService {
  private eventCounter = 0;

  incrementCounter(): void {
    this.eventCounter++;
  }

  getCounter(): number {
    return this.eventCounter;
  }

  getStats() {
    return {
      service: 'service-2',
      eventsProcessed: this.eventCounter,
      timestamp: new Date().toISOString(),
    };
  }
}
