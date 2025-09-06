import { UserDTO } from '../../../domain/entities/user.types';
import { PageResultCursor } from '@libs/nestjs-common';

export type GetUsersCursorQueryResponse = PageResultCursor<UserDTO>;
