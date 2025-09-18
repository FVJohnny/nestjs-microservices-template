import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { VerifyEmail_Command } from '@bc/auth/application/commands';
import { VerifyEmailRequestDto } from './verify-email-verification.params';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import { COMMAND_BUS } from '@libs/nestjs-common';

@ApiTags('email-verification')
@Controller('email-verification')
export class VerifyEmailVerification_Controller {
  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  @Post('verify')
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
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired email verification',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async verifyEmail(@Body() body: VerifyEmailRequestDto) {
    const command = new VerifyEmail_Command({
      emailVerificationId: body.emailVerificationId,
    });

    await this.commandBus.execute<VerifyEmail_Command, void>(command);
  }
}
