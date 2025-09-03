import { UserDTO } from '../../../domain/entities/user.types';
import { OffsetPageResult } from '@libs/nestjs-common';

export interface GetUsersQueryResponse extends OffsetPageResult<UserDTO> {}
export class GetUsersQueryResponse implements GetUsersQueryResponse {}
