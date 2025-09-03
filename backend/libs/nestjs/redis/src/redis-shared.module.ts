import { Global,Module } from '@nestjs/common';

import { RedisController } from './redis.controller';
import { RedisService } from './redis.service';

@Global()
@Module({
  controllers: [RedisController],
  providers: [RedisService],
  exports: [RedisService],
})
export class SharedRedisModule {}