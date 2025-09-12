import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  VerifyEmailCommand,
  VerifyEmailCommandResponse,
} from '../../../../application/commands/verify-email/verify-email.command';
import { VerifyEmailRequestDto, VerifyEmailResponseDto } from './verify-email.params';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class VerifyEmailController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email address',
    description: 'Verifies a user email address using the token sent to their email',
  })
  @ApiBody({
    description: 'Email verification token',
    type: VerifyEmailRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired verification token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
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
