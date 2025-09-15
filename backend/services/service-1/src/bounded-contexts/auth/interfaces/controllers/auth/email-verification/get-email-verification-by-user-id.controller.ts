import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  GetEmailVerificationByUserIdQuery,
  GetEmailVerificationByUserIdQueryResponse,
} from '@bc/auth/application/queries';

@ApiTags('auth')
@Controller('auth')
export class GetEmailVerificationByUserIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('email-verification/user/:userId')
  @ApiOperation({ summary: 'Get email verification by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Email verification found',
    type: GetEmailVerificationByUserIdQueryResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Email verification not found',
  })
  async getEmailVerificationByUserId(
    @Param('userId') userId: string,
  ): Promise<GetEmailVerificationByUserIdQueryResponse> {
    const query = new GetEmailVerificationByUserIdQuery({ userId });
    return await this.queryBus.execute(query);
  }
}
