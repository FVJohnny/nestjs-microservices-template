import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecordUserLoginCommand } from '@bc/auth/application/commands';
import {
  GetTokensFromUserCredentialsQuery,
  GetTokensFromUserCredentialsQueryResponse,
} from '@bc/auth/application/queries';
import { LoginUserControllerParams } from './login-user.params';
import { LoginUserResponseDto } from './login-user.response';

@ApiTags('auth')
@Controller('auth')
export class LoginUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in',
    type: LoginUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async loginUser(
    @Body() body: LoginUserControllerParams,
  ): Promise<GetTokensFromUserCredentialsQueryResponse> {
    // Get tokens using query
    const tokensQuery = new GetTokensFromUserCredentialsQuery({
      email: body.email,
      password: body.password,
    });
    const { accessToken, refreshToken, userId } = await this.queryBus.execute(tokensQuery);

    // Record login using command (async)
    const recordLoginCommand = new RecordUserLoginCommand(userId);
    this.commandBus.execute(recordLoginCommand);

    return {
      accessToken,
      refreshToken,
      userId,
    };
  }
}
