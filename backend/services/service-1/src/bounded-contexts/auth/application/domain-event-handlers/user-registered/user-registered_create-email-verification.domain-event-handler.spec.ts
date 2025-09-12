import { UserRegistered_CreateEmailVerification_DomainEventHandler } from './user-registered_create-email-verification.domain-event-handler';
import {
  UserRegisteredDomainEvent,
} from '../../../domain/events/user-registered.domain-event';
import { Email } from '../../../domain/value-objects';
import { createCommandBusMock } from '@libs/nestjs-common';
import { CreateEmailVerificationCommand } from '../../commands/create-email-verification/create-email-verification.command';
import { User } from '../../../domain/entities/user/user.entity';

describe('UserRegistered_CreateEmailVerification_DomainEventHandler', () => {

    const createEventFromUser = (user: User) =>
      new UserRegisteredDomainEvent({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

  // Setup factory
  const setup = (params: { shouldFailCommandBus?: boolean } = {}) => {
    const { shouldFailCommandBus = false } = params;

    const mockCommandBus = createCommandBusMock({ shouldFail: shouldFailCommandBus });
    const eventHandler = new UserRegistered_CreateEmailVerification_DomainEventHandler(
      mockCommandBus as any,
    );

    return { mockCommandBus, eventHandler };
  };

  describe('Happy Path', () => {
    it('should execute CreateEmailVerificationCommand with correct user data', async () => {
      // Arrange
      const { eventHandler, mockCommandBus } = setup();
      const user = User.random();
      const event = createEventFromUser(user);

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(mockCommandBus.commands).toHaveLength(1);
      const command = mockCommandBus.commands[0] as CreateEmailVerificationCommand;

      expect(command).toBeInstanceOf(CreateEmailVerificationCommand);
      expect(command.userId).toBe(user.id);
      expect(command.email).toBe(user.email.toValue());
    });

    it('should handle special characters in email', async () => {
      // Arrange
      const { eventHandler, mockCommandBus } = setup();
      const user = User.random({ email: new Email('test.user+tag@example-domain.com') });
      const event = createEventFromUser(user);

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(mockCommandBus.commands).toHaveLength(1);
      const command = mockCommandBus.commands[0] as CreateEmailVerificationCommand;

      expect(command.userId).toBe(user.id);
      expect(command.email).toBe(user.email.toValue());
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const { eventHandler, mockCommandBus } = setup();
      const users = [
        User.random(),
        User.random(),
        User.random(),
      ];
      const events = users.map((user) => createEventFromUser(user));

      // Act
      for (const event of events) {
        await eventHandler.handle(event);
      }

      // Assert
      expect(mockCommandBus.commands).toHaveLength(3);

      const command1 = mockCommandBus.commands[0] as CreateEmailVerificationCommand;
      expect(command1.userId).toBe(users[0].id);
      expect(command1.email).toBe(users[0].email.toValue());

      const command2 = mockCommandBus.commands[1] as CreateEmailVerificationCommand;
      expect(command2.userId).toBe(users[1].id);
      expect(command2.email).toBe(users[1].email.toValue());

      const command3 = mockCommandBus.commands[2] as CreateEmailVerificationCommand;
      expect(command3.userId).toBe(users[2].id);
      expect(command3.email).toBe(users[2].email.toValue());
    });
  });

  describe('Error Cases', () => {
    it('should handle command bus execution failure gracefully', async () => {
      // Arrange
      const { eventHandler } = setup({ shouldFailCommandBus: true });
      const user = User.random();
      const event = createEventFromUser(user);

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow('CommandBus execute failed');
    });
  });
});