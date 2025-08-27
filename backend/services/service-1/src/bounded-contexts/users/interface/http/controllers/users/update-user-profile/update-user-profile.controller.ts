import {
  Controller,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UpdateUserProfileCommand } from '../../../../../application/commands/update-user-profile.command';
import { UpdateUserProfileBodyDto } from './update-user-profile.body';
import { UpdateUserProfileResponseDto } from './update-user-profile.response';

@ApiTags('users')
@Controller('users')
export class UpdateUserProfileController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User profile updated',
    type: UpdateUserProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserProfile(
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileBodyDto,
  ): Promise<UpdateUserProfileResponseDto> {
    const command = new UpdateUserProfileCommand(
      id,
      dto.firstName,
      dto.lastName,
      dto.metadata,
    );

    const user = await this.commandBus.execute(command);
    return UpdateUserProfileResponseDto.fromEntity(user);
  }
}