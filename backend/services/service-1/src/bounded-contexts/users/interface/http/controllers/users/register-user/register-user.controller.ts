import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterUserCommand } from '../../../../../application/commands/register-user.command';
import { RegisterUserBodyDto } from './register-user.body';
import { RegisterUserResponseDto } from './register-user.response';

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
    type: RegisterUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user already exists',
  })
  async registerUser(@Body() dto: RegisterUserBodyDto): Promise<RegisterUserResponseDto> {
    const command = new RegisterUserCommand(
      dto.email,
      dto.username,
      dto.firstName,
      dto.lastName,
      dto.roles,
      dto.metadata,
    );

    const user = await this.commandBus.execute(command);
    return RegisterUserResponseDto.fromEntity(user);
  }
}