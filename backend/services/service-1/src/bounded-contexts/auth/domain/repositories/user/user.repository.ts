import type { PaginatedRepoResult, Repository } from '@libs/nestjs-common';
import type { User } from '../../entities/user/user.entity';
import type { Email, Username } from '../../value-objects';
import type { Criteria } from '@libs/nestjs-common';

export const USER_REPOSITORY = Symbol('UserRepository');
export interface UserRepository extends Repository<User, string> {
  findByEmail(email: Email): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  existsByUsername(username: Username): Promise<boolean>;
  findAll(): Promise<User[]>;
  findByCriteria(criteria: Criteria): Promise<PaginatedRepoResult<User>>;
  countByCriteria(criteria: Criteria): Promise<number>;
}
