import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetEmailVerificationByUserId_Query } from './get-email-verification-by-user-id.query';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerification_Repository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { BaseQueryHandler, NotFoundException, Id } from '@libs/nestjs-common';
import { GetEmailVerificationByUserIdQueryResponse } from './get-email-verification-by-user-id.response';

@QueryHandler(GetEmailVerificationByUserId_Query)
export class GetEmailVerificationByUserId_QueryHandler extends BaseQueryHandler<
  GetEmailVerificationByUserId_Query,
  GetEmailVerificationByUserIdQueryResponse
> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerification_Repository,
  ) {
    super();
  }

  protected async handle(
    query: GetEmailVerificationByUserId_Query,
  ): Promise<GetEmailVerificationByUserIdQueryResponse> {
    const emailVerification = await this.emailVerificationRepository.findByUserId(
      new Id(query.userId),
    );

    if (!emailVerification) {
      throw new NotFoundException();
    }

    return emailVerification.toValue();
  }

  protected authorize(_query: GetEmailVerificationByUserId_Query): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected validate(_query: GetEmailVerificationByUserId_Query): Promise<void> {
    return Promise.resolve();
  }
}
