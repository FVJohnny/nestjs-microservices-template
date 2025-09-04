import { UserDTO } from '../../../domain/entities/user.types';
import { OffsetPageResult } from '@libs/nestjs-common';

export type GetUsersQueryResponse = OffsetPageResult<UserDTO>;
