// === DOMAIN ===
// Events
export * from './domain/events/domain-event.base';

// Aggregate Root
export * from './domain/entities/AggregateRoot';

// Value Objects
export { ValueObject } from './domain/value-object/ValueObject';
export { StringValueObject } from './domain/value-object/StringValueObject';
export { EnumValueObject } from './domain/value-object/EnumValueObject';
export { CompositeValueObject } from './domain/value-object/CompositeValueObject';
export { InvalidArgumentError } from './domain/value-object/InvalidArgumentError';

// Repositories
export * from './domain/repositories/repository.base';

// Criteria Pattern
export * from './domain/criteria/Criteria';
export * from './domain/criteria/Filters';
export * from './domain/criteria/Filter';
export * from './domain/criteria/FilterField';
export * from './domain/criteria/FilterOperator';
export * from './domain/criteria/FilterValue';
export * from './domain/criteria/Order';
export * from './domain/criteria/OrderBy';
export * from './domain/criteria/OrderType';

// Infrastructure
export * from './infrastructure/in-memory-criteria-converter';

// Application Layer
export * from './application';

// Interfaces
export * from './interfaces';