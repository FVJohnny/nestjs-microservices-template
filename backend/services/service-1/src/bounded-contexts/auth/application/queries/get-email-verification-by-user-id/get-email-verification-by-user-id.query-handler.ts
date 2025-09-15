import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetEmailVerificationByUserIdQuery } from './get-email-verification-by-user-id.query';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { BaseQueryHandler, NotFoundException, Id } from '@libs/nestjs-common';
import { GetEmailVerificationByUserIdQueryResponse } from './get-email-verification-by-user-id.response';

@QueryHandler(GetEmailVerificationByUserIdQuery)
export class GetEmailVerificationByUserIdQueryHandler extends BaseQueryHandler<
  GetEmailVerificationByUserIdQuery,
  GetEmailVerificationByUserIdQueryResponse
> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerificationRepository,
  ) {
    super();
  }

  protected async handle(
    query: GetEmailVerificationByUserIdQuery,
  ): Promise<GetEmailVerificationByUserIdQueryResponse> {
    const emailVerification = await this.emailVerificationRepository.findByUserId(
      new Id(query.userId),
    );

    if (!emailVerification) {
      throw new NotFoundException();
    }

    return emailVerification.toValue();
  }

  protected authorize(_query: GetEmailVerificationByUserIdQuery): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected validate(_query: GetEmailVerificationByUserIdQuery): Promise<void> {
    return Promise.resolve();
  }
}
