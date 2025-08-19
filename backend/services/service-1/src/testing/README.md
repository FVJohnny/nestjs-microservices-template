# Testing Utilities for Service-1

This directory contains testing utilities specific to service-1.

## Testing Helper

The `testing-helper.ts` provides a `createTestingModule` function for setting up test modules with CQRS support.

### Features

- **EventBus tracking**: Access `eventBus.events` to check domain events
- **EventPublisher tracking**: Access `eventPublisher.events` to check integration events  
- **Error simulation**: Use `shouldDomainEventPublishFail` to test error scenarios
- **Type safety**: Full TypeScript support with proper interfaces

### Usage

```typescript
import { createTestingModule } from '../testing';

const { eventBus, eventPublisher, commandHandler } = await createTestingModule({
  commands: {
    commandHandler: MyCommandHandler,
  },
  events: {
    eventHandler: MyEventHandler,  // Optional: enables EventPublisher
    shouldDomainEventPublishFail: false,
  },
  repositories: { 
    name: 'MyRepository', 
    repository: MyInMemoryRepository 
  }
});

// Test domain events
const domainEvent = eventBus.events.pop();

// Test integration events (if eventHandler provided)
const integrationEvent = eventPublisher?.events.pop();
```

### Notes

- EventPublisher is only available when `eventHandler` is provided in options
- All event arrays are automatically cleared between tests
- Use relative imports from test files: `import { createTestingModule } from '../testing';`