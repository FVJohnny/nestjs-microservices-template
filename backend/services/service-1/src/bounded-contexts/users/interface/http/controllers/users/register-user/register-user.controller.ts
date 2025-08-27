import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterUserCommand, RegisterUserResponse } from '../../../../../application/commands';
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
    type: RegisterUserResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user already exists',
  })
  async registerUser(@Body() dto: RegisterUserBodyDto): Promise<RegisterUserResponse> {
    const command = new RegisterUserCommand(
      dto.email,
      dto.username,
      dto.firstName,
      dto.lastName,
      dto.roles,
      dto.metadata,
    );

    return await this.commandBus.execute(command);
  }
}