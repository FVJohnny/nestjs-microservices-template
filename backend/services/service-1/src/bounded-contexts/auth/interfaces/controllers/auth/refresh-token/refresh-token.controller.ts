import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type IQueryBus } from '@nestjs/cqrs';
import { type ICommandBus } from '@nestjs/cqrs';
import { QUERY_BUS, COMMAND_BUS } from '@libs/nestjs-common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  GetTokensFromRefreshToken_Query,
  GetTokensFromRefreshTokenQueryResponse,
} from '@bc/auth/application/queries';
import { RefreshToken_ControllerParams } from './refresh-token.params';
import { RefreshTokenResponseDto } from './refresh-token.response';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { UseGuards } from '@nestjs/common';
import { StoreTokens_Command } from '@bc/auth/application/commands/store-tokens/store-tokens.command';

@ApiTags('auth')
@Controller('auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RefreshToken_Controller {
  constructor(
    @Inject(QUERY_BUS) private readonly queryBus: IQueryBus,
    @Inject(COMMAND_BUS) private readonly commandBus: ICommandBus,
  ) {}

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
    // Get new tokens
    const getTokensQuery = new GetTokensFromRefreshToken_Query(body.refreshToken);
    const { userId, accessToken, refreshToken } = await this.queryBus.execute(getTokensQuery);

    // Store new tokens
    const storeTokensCommand = new StoreTokens_Command({ userId, accessToken, refreshToken });
    await this.commandBus.execute(storeTokensCommand);

    return { accessToken, refreshToken, userId };
  }
}
