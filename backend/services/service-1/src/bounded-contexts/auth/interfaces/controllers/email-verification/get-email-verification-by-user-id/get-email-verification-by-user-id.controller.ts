import { Controller, Get, Query } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type IQueryBus } from '@nestjs/cqrs';
import { QUERY_BUS } from '@libs/nestjs-common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  GetEmailVerificationByUserId_Query,
  GetEmailVerificationByUserIdQueryResponse,
} from '@bc/auth/application/queries';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { UseGuards } from '@nestjs/common';

@ApiTags('email-verification')
@Controller('email-verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GetEmailVerificationByUserId_Controller {
  constructor(@Inject(QUERY_BUS) private readonly queryBus: IQueryBus) {}

  @Get('')
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
