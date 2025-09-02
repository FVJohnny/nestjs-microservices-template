import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Criteria, InMemoryCriteriaConverter, PaginatedRepoResult } from '@libs/nestjs-common';

@Injectable()
export class UserInMemoryRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return user;
      }
    }
    return null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username.equals(username)) {
        return user;
      }
    }
    return null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return true;
      }
    }
    return false;
  }

  async existsByUsername(username: Username): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.username.equals(username)) {
        return true;
      }
    }
    return false;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async findByCriteria(criteria: Criteria): Promise<PaginatedRepoResult<User>> {
    const users = Array.from(this.users.values());
    const { filterFn, sortFn, paginationFn } = InMemoryCriteriaConverter.convert<User>(criteria);

    let result = filterFn(users);
    
    if (sortFn) {
      result.sort(sortFn);
    }
    
    return {
      data: paginationFn(result),
      total: criteria.withTotal ? result.length : null
    };
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    const users = Array.from(this.users.values());
    const { filterFn, sortFn } = InMemoryCriteriaConverter.convert<User>(criteria);

    // Apply only filters, ignore pagination for count
    const filteredUsers = filterFn(users);
    return filteredUsers.length;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  async remove(id: string): Promise<void> {
    await this.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.users.has(id);
  }

}