import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  GetEmailVerificationByUserId_Query,
  GetEmailVerificationByUserIdQueryResponse,
} from '@bc/auth/application/queries';

@ApiTags('auth')
@Controller('auth')
export class GetEmailVerificationByUserId_Controller {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('email-verification')
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
    @Query('userId') userId: string,
  ): Promise<GetEmailVerificationByUserIdQueryResponse> {
    const query = new GetEmailVerificationByUserId_Query({ userId });
    return await this.queryBus.execute(query);
  }
}
