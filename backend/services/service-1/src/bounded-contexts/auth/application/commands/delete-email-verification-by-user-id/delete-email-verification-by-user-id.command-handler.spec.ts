import { DeleteEmailVerificationByUserId_CommandHandler } from './delete-email-verification-by-user-id.command-handler';
import { DeleteEmailVerificationByUserId_Command } from './delete-email-verification-by-user-id.command';
import { EmailVerification_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import type { EventBus } from '@nestjs/cqrs';
import {
  createEventBusMock,
  InfrastructureException,
  NotFoundException,
  Id,
} from '@libs/nestjs-common';

describe('DeleteEmailVerificationByUserId_CommandHandler', () => {
  const createCommand = ({ userId }: { userId?: string } = {}) =>
    new DeleteEmailVerificationByUserId_Command({ userId: userId ?? Id.random().toValue() });

  const setup = async (
    params: {
      withVerification?: boolean;
      shouldFailRepository?: boolean;
      shouldFailEventBus?: boolean; // currently not used but keeps parity
    } = {},
  ) => {
    const {
      withVerification = false,
      shouldFailRepository = false,
      shouldFailEventBus = false,
    } = params;

    const repository = new EmailVerification_InMemory_Repository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const handler = new DeleteEmailVerificationByUserId_CommandHandler(
      repository,
      eventBus as unknown as EventBus,
    );

    let verification: EmailVerification | null = null;
    if (withVerification && !shouldFailRepository) {
      verification = EmailVerification.random();
      await repository.save(verification);
    }

    return { repository, eventBus, handler, verification };
  };

  describe('Happy Path', () => {
    it('should delete the verification for the given user', async () => {
      const { handler, repository, verification } = await setup({ withVerification: true });
      const command = createCommand({ userId: verification!.userId.toValue() });

      await handler.execute(command);

      expect(await repository.findById(verification!.id)).toBeNull();
      expect(await repository.findByUserId(verification!.userId)).toBeNull();
    });
  });

  describe('Error cases', () => {
    it('should throw NotFoundException when no verification exists for the user', async () => {
      const { handler } = await setup();
      const command = createCommand();

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw InfrastructureException when repository fails', async () => {
      const { handler } = await setup({ shouldFailRepository: true });

      const command = createCommand();

      await expect(handler.execute(command)).rejects.toThrow(InfrastructureException);
    });
  });
});
