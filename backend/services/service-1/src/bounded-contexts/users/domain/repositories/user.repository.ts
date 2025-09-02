import { PaginatedRepoResult, Repository } from '@libs/nestjs-common';
import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { Criteria } from '@libs/nestjs-common';

export const USER_REPOSITORY = Symbol('UserRepository');
export interface UserRepository extends Repository<User, string> {
  findByEmail(email: Email): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  existsByUsername(username: Username): Promise<boolean>;
  findAll(): Promise<User[]>;
  findByCriteria(criteria: Criteria | any): Promise<PaginatedRepoResult<User>>;
  countByCriteria(criteria: Criteria | any): Promise<number>;
  delete(id: string): Promise<void>;
}