import { UserDTO } from '../../../domain/entities/user.types';
import { PageResultOffset } from '@libs/nestjs-common';

export type GetUsersQueryResponse = PageResultOffset<UserDTO>;
