import type { UserDTO } from '@bc/auth/domain/aggregates/user/user.dto';
import type { PageResultCursor } from '@libs/nestjs-common';

export type GetUsersCursor_QueryResponse = PageResultCursor<UserDTO>;
