import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefreshTokenCommand, RefreshTokenCommandResponse } from '../../../../application/commands';
import { RefreshTokenControllerParams } from './refresh-token.params';
import { RefreshTokenResponseDto } from './refresh-token.response';

@ApiTags('auth')
@Controller('auth')
export class RefreshTokenController {
  constructor(private readonly commandBus: CommandBus) {}

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
  ): Promise<RefreshTokenCommandResponse> {
    const command = new RefreshTokenCommand(body.refreshToken);

    return await this.commandBus.execute(command);
  }
}
