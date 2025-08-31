import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterUserCommand, RegisterUserCommandResponse } from '../../../../../application/commands';
import { RegisterUserBodyDto } from './register-user.body';
@ApiTags('users')
@Controller('users')
export class RegisterUserController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
    type: RegisterUserCommandResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user already exists',
  })
  async registerUser(@Body() dto: RegisterUserBodyDto): Promise<RegisterUserCommandResponse> {
    const command = new RegisterUserCommand({
      email: dto.email,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: dto.roles,
    });

    return await this.commandBus.execute(command);
  }
}