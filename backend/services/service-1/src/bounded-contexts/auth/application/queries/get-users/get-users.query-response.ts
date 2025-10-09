import type { UserDTO } from '@bc/auth/domain/entities/user/user.dto';
import type { PageResultOffset } from '@libs/nestjs-common';

export type GetUsers_QueryResponse = PageResultOffset<UserDTO>;
