import type { UserDTO } from '@bc/auth/domain/entities/user/user.types';
import type { PageResultOffset } from '@libs/nestjs-common';

export type GetUsersQueryResponse = PageResultOffset<UserDTO>;
