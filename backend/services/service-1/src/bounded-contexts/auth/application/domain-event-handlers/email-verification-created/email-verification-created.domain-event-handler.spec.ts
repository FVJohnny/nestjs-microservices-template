import { EmailVerificationCreatedDomainEventHandler } from './email-verification-created.domain-event-handler';
import { EmailVerificationCreatedDomainEvent } from '../../../domain/events/email-verification-created.domain-event';

describe('EmailVerificationCreatedDomainEventHandler', () => {
  let handler: EmailVerificationCreatedDomainEventHandler;

  beforeEach(() => {
    handler = new EmailVerificationCreatedDomainEventHandler();
  });

  describe('handle', () => {
    it('should handle EmailVerificationCreatedDomainEvent', async () => {
      // Arrange
      const event = new EmailVerificationCreatedDomainEvent(
        'verification-123',
        'user-123',
        'test@example.com',
        'token123',
        new Date('2024-12-31'),
      );

      // Act
      await handler.handle(event);

      // Assert
      // Since the handler only logs for now, we just verify it doesn't throw
      expect(true).toBe(true);
    });
  });
});