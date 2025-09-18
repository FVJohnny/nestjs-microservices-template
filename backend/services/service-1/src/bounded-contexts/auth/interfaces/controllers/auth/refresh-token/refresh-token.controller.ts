import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  GetTokensFromRefreshToken_Query,
  GetTokensFromRefreshTokenQueryResponse,
} from '@bc/auth/application/queries';
import { RefreshToken_ControllerParams } from './refresh-token.params';
import { RefreshTokenResponseDto } from './refresh-token.response';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { UseGuards } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RefreshToken_Controller {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('refresh-token')
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
    @Body() body: RefreshToken_ControllerParams,
  ): Promise<GetTokensFromRefreshTokenQueryResponse> {
    const query = new GetTokensFromRefreshToken_Query(body.refreshToken);

    return await this.queryBus.execute(query);
  }
}
