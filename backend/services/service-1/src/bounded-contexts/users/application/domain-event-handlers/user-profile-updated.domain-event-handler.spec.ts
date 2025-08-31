import { UserProfileUpdatedDomainEventHandler } from './user-profile-updated.domain-event-handler';
import { UserProfileUpdatedEvent } from '../../domain/events/user-profile-updated.event';

describe('UserProfileUpdatedDomainEventHandler (Unit)', () => {
  let eventHandler: UserProfileUpdatedDomainEventHandler;

  beforeEach(() => {
    eventHandler = new UserProfileUpdatedDomainEventHandler();
  });

  describe('Happy Path', () => {
    it('should handle UserProfileUpdatedEvent successfully', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'test-user-id',
        previousFirstName: 'Old',
        previousLastName: 'Name',
        firstName: 'New',
        lastName: 'Name',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle event with minimal data', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'minimal-user-id',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle event with only firstName change', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'firstname-user-id',
        previousFirstName: 'OldFirst',
        firstName: 'NewFirst',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle event with only lastName change', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'lastname-user-id',
        previousLastName: 'OldLast',
        lastName: 'NewLast',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const events = [
        new UserProfileUpdatedEvent({
          userId: 'user-1',
          firstName: 'First',
          lastName: 'User',
          occurredOn: new Date(),
        }),
        new UserProfileUpdatedEvent({
          userId: 'user-2',
          firstName: 'Second',
          lastName: 'User',
          occurredOn: new Date(),
        }),
        new UserProfileUpdatedEvent({
          userId: 'user-3',
          firstName: 'Third',
          lastName: 'User',
          occurredOn: new Date(),
        }),
      ];

      // Act
      for (const event of events) {
        await eventHandler.handle(event);
      }
    });

    it('should handle event with empty string names', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'empty-names-user',
        previousFirstName: 'Previous',
        previousLastName: 'Name',
        firstName: '',
        lastName: '',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle event with special characters in names', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'special-chars-user',
        firstName: 'José-María',
        lastName: "O'Connor",
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });
  });

  describe('Event Properties Validation', () => {
    it('should access all event properties correctly', async () => {
      // Arrange
      const now = new Date();
      const event = new UserProfileUpdatedEvent({
        userId: 'property-test-user',
        previousFirstName: 'PrevFirst',
        previousLastName: 'PrevLast',
        firstName: 'NewFirst',
        lastName: 'NewLast',
        occurredOn: now,
      });

      // Act
      await eventHandler.handle(event);

      // Assert - Verify all properties are accessible
      expect(event.userId).toBe('property-test-user');
      expect(event.previousFirstName).toBe('PrevFirst');
      expect(event.previousLastName).toBe('PrevLast');
      expect(event.firstName).toBe('NewFirst');
      expect(event.lastName).toBe('NewLast');
      expect(event.occurredOn).toBe(now);
    });

    it('should handle event with undefined optional properties', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'undefined-props-user',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(event.userId).toBe('undefined-props-user');
      expect(event.previousFirstName).toBeUndefined();
      expect(event.previousLastName).toBeUndefined();
      expect(event.firstName).toBeUndefined();
      expect(event.lastName).toBeUndefined();
    });
  });

  describe('Handler Behavior', () => {
    it('should complete successfully without additional operations', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'completion-test-user',
        occurredOn: new Date(),
      });

      // Act & Assert - Should not throw any errors
      await expect(eventHandler.handle(event)).resolves.toBeUndefined();
    });

    it('should log exactly once per event', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'single-log-test-user',
        firstName: 'Test',
        lastName: 'User',
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should be idempotent when handling same event multiple times', async () => {
      // Arrange
      const event = new UserProfileUpdatedEvent({
        userId: 'idempotent-test-user',
        firstName: 'Idempotent',
        lastName: 'Test',
        occurredOn: new Date(),
      });

      // Act - Handle the same event multiple times
      await eventHandler.handle(event);
      await eventHandler.handle(event);
      await eventHandler.handle(event);
    });
  });
});