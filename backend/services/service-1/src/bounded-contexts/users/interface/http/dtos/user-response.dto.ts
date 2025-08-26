import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { UserStatusEnum } from '../../../domain/value-objects/user-status.vo';
import { User } from '../../../domain/entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ enum: UserStatusEnum })
  status: UserStatusEnum;

  @ApiProperty({ enum: UserRoleEnum, isArray: true })
  roles: UserRoleEnum[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email.value,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      status: user.status.value,
      roles: user.roles.map(r => r.value),
      metadata: user.metadata,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}