import { Controller, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import { COMMAND_BUS } from '@libs/nestjs-common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeleteUser_Command } from '@bc/auth/application/commands';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { UseGuards } from '@nestjs/common';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DeleteUser_Controller {
  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async deleteUser(@Param('userId') userId: string): Promise<void> {
    const command = new DeleteUser_Command({ userId });

    await this.commandBus.execute(command);
  }
}
