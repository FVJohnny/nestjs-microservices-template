# Configurable Events Module

Shared NestJS module for configurable messaging backends (Kafka/Redis) with dependency injection.

## Installation

```bash
# In your service's package.json
"@libs/nestjs-events": "file:../../libs/nestjs/events"

# ALSO install the messaging backend(s) you need:
# For Redis only:
"@libs/nestjs-redis": "file:../../libs/nestjs/redis"

# For Kafka only:
"@libs/nestjs-kafka": "file:../../libs/nestjs/kafka"

# For both (flexibility to switch via env var):
"@libs/nestjs-redis": "file:../../libs/nestjs/redis"
"@libs/nestjs-kafka": "file:../../libs/nestjs/kafka"
```

## Usage

### Both Backends Available (Recommended)

```typescript
// app.module.ts
import { ConfigurableEventsModule } from '@libs/nestjs-events';
import { SharedKafkaModule, KafkaService, KafkaEventPublisher, KafkaEventListener } from '@libs/nestjs-kafka';
import { SharedRedisModule, RedisService, RedisEventPublisher, RedisEventListener } from '@libs/nestjs-redis';

@Module({
  imports: [
    // Uses MESSAGING_BACKEND env var to choose between kafka/redis
    ConfigurableEventsModule.forRoot({
      kafka: { sharedModule: SharedKafkaModule, service: KafkaService, eventPublisher: KafkaEventPublisher, eventListener: KafkaEventListener },
      redis: { sharedModule: SharedRedisModule, service: RedisService, eventPublisher: RedisEventPublisher, eventListener: RedisEventListener }
    }),
  ],
})
export class AppModule {}
```

### Single Backend Only

```typescript
// app.module.ts (Redis only)
import { ConfigurableEventsModule } from '@libs/nestjs-events';
import { SharedRedisModule, RedisService, RedisEventPublisher, RedisEventListener } from '@libs/nestjs-redis';

@Module({
  imports: [
    ConfigurableEventsModule.forRoot({
      redis: { sharedModule: SharedRedisModule, service: RedisService, eventPublisher: RedisEventPublisher, eventListener: RedisEventListener }
    }),
  ],
})
export class AppModule {}
```

## Environment Variables

```bash
# Select messaging backend
MESSAGING_BACKEND=redis  # or 'kafka'
```

## Benefits

✅ **No Module Resolution Issues**: Uses dependency injection instead of dynamic imports  
✅ **Bundle Size Optimization**: Only includes the messaging libraries you import  
✅ **Shareable**: Same module works across all services  
✅ **Environment Configurable**: Switch backends via `MESSAGING_BACKEND`  
✅ **Type Safe**: Full TypeScript support  

## Bundle Size Optimization

- Only import the messaging libraries your service needs
- Unused libraries won't be bundled 
- No dynamic `require()` calls that could cause resolution issues

## Requirements

- Services must import the messaging libraries they want to use
- Pass the imported modules to `ConfigurableEventsModule.forRoot()`
- Install corresponding `@libs/nestjs-kafka` or `@libs/nestjs-redis` packages

## Error Handling

Clear error messages when backend is selected but not provided:
- "Kafka backend selected but Kafka modules not provided. Please import Kafka dependencies."
- "Redis backend selected but Redis modules not provided. Please import Redis dependencies."