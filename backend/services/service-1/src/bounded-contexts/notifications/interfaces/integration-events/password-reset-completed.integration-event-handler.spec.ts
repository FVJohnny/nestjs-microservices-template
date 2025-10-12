import { PasswordResetCompleted_IntegrationEventHandler } from './password-reset-completed.integration-event-handler';
import { SendEmail_Command } from '@bc/notifications/application/commands';
import { PasswordResetCompleted_IntegrationEvent } from '@libs/nestjs-common';

describe('PasswordResetCompleted_IntegrationEventHandler', () => {
  let handler: PasswordResetCompleted_IntegrationEventHandler;
  let mockCommandBus: {
    execute: jest.Mock;
  };

  beforeEach(() => {
    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    handler = new PasswordResetCompleted_IntegrationEventHandler(mockCommandBus as any);
  });

  describe('handleEvent', () => {
    it('should execute SendEmail_Command with correct parameters', async () => {
      // Arrange
      const event = PasswordResetCompleted_IntegrationEvent.random();

      // Act
      await handler.handleEvent(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const command = mockCommandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(SendEmail_Command);
      expect(command.email).toBe(event.email);
      expect(command.subject).toBe('Password changed successfully');
      expect(command.message).toContain('password has been successfully changed');
      expect(command.message).toContain('contact support');
    });

    it('should propagate command bus errors', async () => {
      // Arrange
      const event = PasswordResetCompleted_IntegrationEvent.random();
      const error = new Error('Command bus failed');
      mockCommandBus.execute.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleEvent(event)).rejects.toThrow('Command bus failed');
    });
  });
});
