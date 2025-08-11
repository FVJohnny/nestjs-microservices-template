import { Controller, Get } from '@nestjs/common';

@Controller()
export class HeartbeatController {
  @Get('health')
  getHealth(): string {
    return 'ok';
  }
}
