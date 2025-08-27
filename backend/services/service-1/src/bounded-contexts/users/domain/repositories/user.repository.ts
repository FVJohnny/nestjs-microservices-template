import { Repository } from '@libs/nestjs-common';
import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { Criteria } from '@libs/nestjs-common';

export interface UserRepository extends Repository<User, string> {
  findByEmail(email: Email): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  findAll(): Promise<User[]>;
  findByCriteria(criteria: Criteria | any): Promise<User[]>;
  countByCriteria(criteria: Criteria | any): Promise<number>;
  delete(id: string): Promise<void>;
}