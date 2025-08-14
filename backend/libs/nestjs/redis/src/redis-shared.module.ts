import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisConfigService } from './redis-config.service';

@Global()
@Module({
  providers: [RedisConfigService, RedisService],
  exports: [RedisService, RedisConfigService],
})
export class SharedRedisModule {}