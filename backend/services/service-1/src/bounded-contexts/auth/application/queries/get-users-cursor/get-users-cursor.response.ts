import type { UserDTO } from '@bc/auth/domain/entities/user/user.types';
import type { PageResultCursor } from '@libs/nestjs-common';

export type GetUsersCursorQueryResponse = PageResultCursor<UserDTO>;
