import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginUserCommand, LoginUserCommandResponse } from '@bc/auth/application/commands';
import { LoginUserControllerParams } from './login-user.params';
import { LoginUserResponseDto } from './login-user.response';

@ApiTags('auth')
@Controller('auth')
export class LoginUserController {
  constructor(private readonly commandBus: CommandBus) {}

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
  async loginUser(@Body() body: LoginUserControllerParams): Promise<LoginUserCommandResponse> {
    const command = new LoginUserCommand(body.email, body.password);

    return await this.commandBus.execute(command);
  }
}
