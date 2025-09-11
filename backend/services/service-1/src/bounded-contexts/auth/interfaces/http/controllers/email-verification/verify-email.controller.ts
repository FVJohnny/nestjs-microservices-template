import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  VerifyEmailCommand,
  VerifyEmailCommandResponse,
} from '../../../../application/commands/verify-email/verify-email.command';
import { VerifyEmailRequestDto, VerifyEmailResponseDto } from './verify-email.params';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class VerifyEmailController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    const command = new VerifyEmailCommand({
      token: body.token,
    });

    const result = await this.commandBus.execute<VerifyEmailCommand, VerifyEmailCommandResponse>(
      command,
    );

    return {
      success: result.success,
      userId: result.userId,
    };
  }
}
