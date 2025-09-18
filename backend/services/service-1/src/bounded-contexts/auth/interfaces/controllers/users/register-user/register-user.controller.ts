import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterUser_Command } from '@bc/auth/application/commands';
import { RegisterUser_ControllerParams } from './register-user.params';

@ApiTags('users')
@Controller('users')
export class RegisterUser_Controller {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user already exists',
  })
  async registerUser(@Body() body: RegisterUser_ControllerParams) {
    const command = new RegisterUser_Command(body);

    await this.commandBus.execute(command);
  }
}
