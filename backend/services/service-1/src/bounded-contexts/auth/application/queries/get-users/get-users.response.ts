import type { UserDTO } from '../../../domain/entities/user/user.types';
import type { PageResultOffset } from '@libs/nestjs-common';

export type GetUsersQueryResponse = PageResultOffset<UserDTO>;
