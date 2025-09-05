import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import {
  Criteria,
  InMemoryCriteriaConverter,
  PaginatedRepoResult,
} from '@libs/nestjs-common';

@Injectable()
export class UserInMemoryRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  save(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) || null);
  }

  findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  findByUsername(username: Username): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username.equals(username)) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  existsByEmail(email: Email): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return Promise.resolve(true);
      }
    }
    return Promise.resolve(false);
  }

  existsByUsername(username: Username): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.username.equals(username)) {
        return Promise.resolve(true);
      }
    }
    return Promise.resolve(false);
  }

  findAll(): Promise<User[]> {
    return Promise.resolve(Array.from(this.users.values()));
  }

  findByCriteria(criteria: Criteria): Promise<PaginatedRepoResult<User>> {
    const users = Array.from(this.users.values());
    const { filterFn, sortFn, paginationFn } =
      InMemoryCriteriaConverter.convert<User>(criteria);

    const result = filterFn(users);

    if (sortFn) {
      result.sort(sortFn);
    }

    const paginatedResults = paginationFn(result);
    return Promise.resolve({
      data: paginatedResults.data,
      total: criteria.hasWithTotal() ? paginatedResults.total : null,
    });
  }

  countByCriteria(criteria: Criteria): Promise<number> {
    const users = Array.from(this.users.values());
    const { filterFn } = InMemoryCriteriaConverter.convert<User>(criteria);

    // Apply only filters, ignore pagination for count
    const filteredUsers = filterFn(users);
    return Promise.resolve(filteredUsers.length);
  }

  delete(id: string): Promise<void> {
    this.users.delete(id);
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    return this.delete(id);
  }

  exists(id: string): Promise<boolean> {
    return Promise.resolve(this.users.has(id));
  }
}
