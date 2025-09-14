import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { VerifyEmailCommand, VerifyEmailCommandResponse } from '@bc/auth/application/commands';
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
    description: 'Verifies a user email address using the email verification ID',
  })
  @ApiBody({
    description: 'Email verification ID',
    type: VerifyEmailRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired email verification',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async verifyEmail(@Body() body: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    const command = new VerifyEmailCommand({
      emailVerificationId: body.emailVerificationId,
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
