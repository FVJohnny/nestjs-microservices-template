import {
  Controller,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UpdateUserProfileCommand } from '../../../../../application/commands';
import { UpdateUserProfileControllerParams } from './update-user-profile.params';

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
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserProfile(
    @Param('id') id: string,
    @Body() body: UpdateUserProfileControllerParams,
  ): Promise<void> {
    const command = new UpdateUserProfileCommand({
      userId: id,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    await this.commandBus.execute(command);
  }
}

console.log('UpdateUserProfileController');
const command = new UpdateUserProfileCommand({
  userId: 'user iddd',
  firstName: 'first name',
  lastName: 'last name',
});
console.log(command);