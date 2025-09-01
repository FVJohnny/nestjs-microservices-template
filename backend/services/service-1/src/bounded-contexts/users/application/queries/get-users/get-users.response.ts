import { UserDTO } from '../../../domain/entities/user.types';

export class GetUsersQueryResponse {
  users: UserDTO[];
}