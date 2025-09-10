import type { UserDTO } from '../../../domain/entities/user/user.types';
import type { PageResultCursor } from '@libs/nestjs-common';

export type GetUsersCursorQueryResponse = PageResultCursor<UserDTO>;
