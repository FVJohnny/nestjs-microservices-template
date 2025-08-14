# Event-Driven Kafka Architecture

This directory implements a clean, scalable event-driven architecture for handling Kafka messages. Instead of monolithic topic handlers that route internally, we use a pattern where each event type has its own dedicated handler.

## Architecture Overview

```
kafka/
├── base/                           # Base interfaces and classes
│   ├── kafka-event-handler.interface.ts
│   └── base-topic.handler.ts
└── topics/                         # One folder per Kafka topic
    ├── trading-signals/
    │   ├── trading-signals.topic-handler.ts    # Topic delegator
    │   ├── events/                              # Event-specific handlers
    │   │   ├── channel-create.event-handler.ts
    │   │   ├── signal-received.event-handler.ts
    │   │   └── position-updated.event-handler.ts
    │   └── index.ts
    ├── user-activity/
    │   ├── user-activity.topic-handler.ts
    │   ├── events/
    │   │   ├── user-registered.event-handler.ts
    │   │   └── user-updated.event-handler.ts
    │   └── index.ts
    └── channels/
        ├── channels.topic-handler.ts
        ├── events/
        │   ├── channel-created.event-handler.ts
        │   └── channel-deleted.event-handler.ts
        └── index.ts
```

## Key Principles

### 1. Single Responsibility
- **Topic Handlers**: Handle Kafka message parsing, validation, and routing
- **Event Handlers**: Handle business logic for specific event types

### 2. Clear Separation of Concerns
- Topic handlers never contain business logic
- Event handlers never deal with Kafka message parsing
- Each event handler handles exactly one event type

### 3. Type Safety
- All handlers implement clear interfaces
- Object-based constructors prevent parameter confusion
- TypeScript ensures compile-time safety

## Implementation Guide

### Step 1: Create Event Handler

```typescript
// events/my-event.event-handler.ts
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaEventHandler } from '../../../base/kafka-event-handler.interface';

@Injectable()
export class MyEventHandler implements KafkaEventHandler {
  readonly eventName = 'my.event';
  private readonly logger = new CorrelationLogger(MyEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(payload: Record<string, unknown>, messageId: string): Promise<void> {
    this.logger.log(`Processing ${this.eventName} event [${messageId}]`);

    try {
      // 1. Extract and validate payload
      const requiredField = payload.requiredField as string;
      if (!requiredField) {
        throw new Error(`Missing requiredField in ${this.eventName} event [${messageId}]`);
      }

      // 2. Execute business logic (usually via CQRS commands)
      const command = new MyCommand({ requiredField });
      await this.commandBus.execute(command);

      this.logger.log(`✅ ${this.eventName} processed successfully [${messageId}]`);
    } catch (error) {
      this.logger.error(`❌ Failed to process ${this.eventName} event [${messageId}]: ${error}`);
      throw error; // Re-throw to trigger retry mechanism
    }
  }
}
```

### Step 2: Create Topic Handler

```typescript
// my-topic.topic-handler.ts
import { Injectable } from '@nestjs/common';
import { KafkaService } from '@libs/nestjs-kafka';
import { BaseTopicHandler } from '../../base/base-topic.handler';
import { MyEventHandler } from './events/my-event.event-handler';

@Injectable()
export class MyTopicHandler extends BaseTopicHandler {
  readonly topicName = 'my-topic';

  constructor(
    kafkaService: KafkaService,
    private readonly myEventHandler: MyEventHandler,
    // Add other event handlers here
  ) {
    super(kafkaService);
  }

  async onModuleInit() {
    // Register all event handlers for this topic
    this.registerEventHandler(this.myEventHandler);
    
    // Call parent to register with Kafka service
    await super.onModuleInit();
  }
}
```

### Step 3: Create Index File

```typescript
// index.ts
export * from './my-topic.topic-handler';
export * from './events/my-event.event-handler';
```

### Step 4: Update Module

```typescript
// In your module file
import { MyTopicHandler } from './interfaces/messaging/kafka/topics/my-topic/my-topic.topic-handler';
import { MyEventHandler } from './interfaces/messaging/kafka/topics/my-topic/events/my-event.event-handler';

const KafkaHandlers = [
  MyTopicHandler,
  MyEventHandler,
  // ... other handlers
];

@Module({
  providers: [
    ...KafkaHandlers,
    // ... other providers
  ],
})
export class MyModule {}
```

## Message Format Requirements

For this architecture to work, Kafka messages must include an `eventName` field:

```json
{
  "messageId": "unique-message-id",
  "eventName": "my.event",
  "data": {
    "requiredField": "value",
    "optionalField": "value"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Benefits

### ✅ Maintainability
- Easy to find and modify handlers for specific events
- Changes to one event don't affect others
- Clear file organization

### ✅ Scalability
- Adding new events is just creating a new handler file
- No need to modify existing code
- Each handler can be optimized independently

### ✅ Testability
- Each event handler can be unit tested in isolation
- Mock dependencies easily
- Clear input/output contracts

### ✅ Type Safety
- Compile-time validation of handler implementations
- Object-based constructors prevent parameter errors
- Clear interfaces prevent implementation mistakes

## Error Handling

The base topic handler provides automatic error handling:

- **Retriable Errors**: Connection issues, timeouts → message will be retried
- **Non-Retriable Errors**: Validation errors, business logic errors → message will be skipped and logged

Customize error handling by overriding `isRetriableError()` in your topic handler.

## Logging

All handlers automatically log:
- Event processing start/success/failure
- Message IDs for traceability
- Event routing decisions
- Error details with context

Use the provided `CorrelationLogger` for consistent log formatting.

## Migration from Monolithic Handlers

1. Identify all event types handled by the monolithic handler
2. Create separate event handlers for each type
3. Create a topic handler that registers all event handlers
4. Update module configuration
5. Remove the old monolithic handler
6. Test thoroughly

## Best Practices

1. **Keep Event Handlers Simple**: Focus on one event type only
2. **Use CQRS Commands**: Don't put business logic directly in handlers
3. **Validate Early**: Check required fields at the start of handlers
4. **Log Comprehensively**: Include message IDs and context in all logs
5. **Handle Errors Gracefully**: Distinguish between retriable and permanent errors
6. **Use Object Constructors**: Avoid positional parameters for commands
7. **Test Independently**: Each handler should have its own test suite
