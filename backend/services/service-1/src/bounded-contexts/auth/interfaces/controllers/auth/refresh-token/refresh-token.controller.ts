import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  GetTokensFromRefreshTokenQuery,
  GetTokensFromRefreshTokenQueryResponse,
} from '@bc/auth/application/queries';
import { RefreshTokenControllerParams } from './refresh-token.params';
import { RefreshTokenResponseDto } from './refresh-token.response';

@ApiTags('auth')
@Controller('auth')
export class RefreshTokenController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens successfully refreshed',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Body() body: RefreshTokenControllerParams,
  ): Promise<GetTokensFromRefreshTokenQueryResponse> {
    const query = new GetTokensFromRefreshTokenQuery(body.refreshToken);

    return await this.queryBus.execute(query);
  }
}
