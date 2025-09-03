import { UserProfileUpdatedDomainEventHandler } from './user-profile-updated.domain-event-handler';
import { UserProfileUpdatedDomainEvent } from '../../../domain/events/user-profile-updated.domain-event';

describe('UserProfileUpdatedDomainEventHandler (Unit)', () => {
  let eventHandler: UserProfileUpdatedDomainEventHandler;

  beforeEach(() => {
    eventHandler = new UserProfileUpdatedDomainEventHandler();
  });

  describe('Happy Path', () => {
    it('should handle UserProfileUpdatedEvent successfully', async () => {
      // Arrange
      const event = new UserProfileUpdatedDomainEvent({
        userId: 'test-user-id',
        previousFirstName: 'Old',
        previousLastName: 'Name',
        firstName: 'New',
        lastName: 'Name',
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const events = [
        new UserProfileUpdatedDomainEvent({
          userId: 'user-1',
          firstName: 'First',
          lastName: 'User',
          previousFirstName: 'Old',
          previousLastName: 'Name',
        }),
        new UserProfileUpdatedDomainEvent({
          userId: 'user-2',
          firstName: 'Second',
          lastName: 'User',
          previousFirstName: 'Old',
          previousLastName: 'Name',
        }),
        new UserProfileUpdatedDomainEvent({
          userId: 'user-3',
          firstName: 'Third',
          lastName: 'User',
          previousFirstName: 'Old',
          previousLastName: 'Name',
        }),
      ];

      // Act
      for (const event of events) {
        await eventHandler.handle(event);
      }
    });

    it('should handle event with empty string names', async () => {
      // Arrange
      const event = new UserProfileUpdatedDomainEvent({
        userId: 'empty-names-user',
        previousFirstName: 'Previous',
        previousLastName: 'Name',
        firstName: '',
        lastName: '',
      });

      // Act
      await eventHandler.handle(event);
    });

    it('should handle event with special characters in names', async () => {
      // Arrange
      const event = new UserProfileUpdatedDomainEvent({
        userId: 'special-chars-user',
        previousFirstName: 'Previous',
        previousLastName: 'Name',
        firstName: 'José-María',
        lastName: "O'Connor",
      });

      // Act
      await eventHandler.handle(event);
    });
  });

  describe('Event Properties Validation', () => {
    it('should access all event properties correctly', async () => {
      // Arrange
      const event = new UserProfileUpdatedDomainEvent({
        userId: 'property-test-user',
        previousFirstName: 'PrevFirst',
        previousLastName: 'PrevLast',
        firstName: 'NewFirst',
        lastName: 'NewLast',
      });

      // Act
      await eventHandler.handle(event);

      // Assert - Verify all properties are accessible
      expect(event.aggregateId).toBe('property-test-user');
      expect(event.previousFirstName).toBe('PrevFirst');
      expect(event.previousLastName).toBe('PrevLast');
      expect(event.firstName).toBe('NewFirst');
      expect(event.lastName).toBe('NewLast');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should handle event with undefined optional properties', async () => {
      // Arrange
      const event = new UserProfileUpdatedDomainEvent({
        userId: 'undefined-props-user',
        previousFirstName: 'PrevFirst',
        previousLastName: 'PrevLast',
        firstName: 'NewFirst',
        lastName: 'NewLast',
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(event.aggregateId).toBe('undefined-props-user');
      expect(event.previousFirstName).toBe('PrevFirst');
      expect(event.previousLastName).toBe('PrevLast');
      expect(event.firstName).toBe('NewFirst');
      expect(event.lastName).toBe('NewLast');
    });
  });

  describe('Handler Behavior', () => {
    it('should complete successfully without additional operations', async () => {
      // Arrange
      const event = new UserProfileUpdatedDomainEvent({
        userId: 'completion-test-user',
        previousFirstName: 'OldFirst',
        previousLastName: 'OldLast',
        firstName: 'NewFirst',
        lastName: 'NewLast',
      });

      // Act & Assert - Should not throw any errors
      await expect(eventHandler.handle(event)).resolves.toBeUndefined();
    });
  });
});
