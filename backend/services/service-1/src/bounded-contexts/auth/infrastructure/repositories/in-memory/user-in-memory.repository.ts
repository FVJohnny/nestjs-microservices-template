import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user/user.entity';
import { UserRepository } from '../../../domain/repositories/user/user.repository';
import { Email, Username } from '../../../domain/value-objects';
import { Criteria, InMemoryCriteriaConverter, PaginatedRepoResult } from '@libs/nestjs-common';
import { UserDTO } from '../../../domain/entities/user/user.types';
import { InfrastructureException } from '@libs/nestjs-common';
import { Id } from '@libs/nestjs-common';

@Injectable()
export class UserInMemoryRepository implements UserRepository {
  private users: Map<string, UserDTO> = new Map();

  constructor(private shouldFail: boolean = false) {}

  async save(user: User): Promise<void> {
    if (this.shouldFail) {
      throw new InfrastructureException('save', 'Repository operation failed', new Error());
    }
    this.users.set(user.id.toValue(), user.toValue());
  }

  async findById(id: Id): Promise<User | null> {
    if (this.shouldFail) {
      throw new InfrastructureException('findById', 'Repository operation failed', new Error());
    }
    const userDTO = this.users.get(id.toValue());
    return userDTO ? User.fromValue(userDTO) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    if (this.shouldFail) {
      throw new InfrastructureException('findByEmail', 'Repository operation failed', new Error());
    }
    for (const userDTO of this.users.values()) {
      if (userDTO.email === email.toValue()) {
        return User.fromValue(userDTO);
      }
    }
    return Promise.resolve(null);
  }

  async findByUsername(username: Username): Promise<User | null> {
    if (this.shouldFail) {
      throw new InfrastructureException(
        'findByUsername',
        'Repository operation failed',
        new Error(),
      );
    }
    for (const userDTO of this.users.values()) {
      if (userDTO.username === username.toValue()) {
        return User.fromValue(userDTO);
      }
    }
    return null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    if (this.shouldFail) {
      throw new InfrastructureException(
        'existsByEmail',
        'Repository operation failed',
        new Error(),
      );
    }
    const userDTO = await this.findByEmail(email);
    return userDTO !== null;
  }

  async existsByUsername(username: Username): Promise<boolean> {
    if (this.shouldFail) {
      throw new InfrastructureException(
        'existsByUsername',
        'Repository operation failed',
        new Error(),
      );
    }
    const userDTO = await this.findByUsername(username);
    return userDTO !== null;
  }

  async findAll(): Promise<User[]> {
    if (this.shouldFail) {
      throw new InfrastructureException('findAll', 'Repository operation failed', new Error());
    }
    return Array.from(this.users.values()).map((u) => User.fromValue(u));
  }

  async findByCriteria(criteria: Criteria): Promise<PaginatedRepoResult<User>> {
    if (this.shouldFail) {
      throw new InfrastructureException(
        'findByCriteria',
        'Repository operation failed',
        new Error(),
      );
    }
    const userDTOs = Array.from(this.users.values());
    const converter = new InMemoryCriteriaConverter(userDTOs);
    const queryResult = await converter.executeQuery(criteria);

    return Promise.resolve({
      data: queryResult.data.map((u) => User.fromValue(u)),
      total: criteria.hasWithTotal() ? queryResult.total : null,
      cursor: queryResult.cursor,
      hasNext: queryResult.hasNext,
    });
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    if (this.shouldFail) {
      throw new InfrastructureException(
        'countByCriteria',
        'Repository operation failed',
        new Error(),
      );
    }
    const converter = new InMemoryCriteriaConverter(Array.from(this.users.values()));
    const count = await converter.count(criteria);
    return count;
  }

  async remove(id: Id): Promise<void> {
    if (this.shouldFail) {
      throw new InfrastructureException('remove', 'Repository operation failed', new Error());
    }
    this.users.delete(id.toValue());
  }

  async exists(id: Id): Promise<boolean> {
    if (this.shouldFail) {
      throw new InfrastructureException('exists', 'Repository operation failed', new Error());
    }
    return this.users.has(id.toValue());
  }
}
