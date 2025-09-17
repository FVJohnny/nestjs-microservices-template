import { Injectable } from '@nestjs/common';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { User_Repository } from '@bc/auth/domain/repositories/user/user.repository';
import { Email, Username } from '@bc/auth/domain/value-objects';
import { AlreadyExistsException, Criteria, InMemoryCriteriaConverter } from '@libs/nestjs-common';
import { UserDTO } from '@bc/auth/domain/entities/user/user.dto';
import { InfrastructureException } from '@libs/nestjs-common';
import { Id } from '@libs/nestjs-common';

@Injectable()
export class User_InMemory_Repository implements User_Repository {
  private users: Map<string, UserDTO> = new Map();

  constructor(private shouldFail: boolean = false) {}

  async save(user: User) {
    if (this.shouldFail) {
      throw new InfrastructureException('save', 'Repository operation failed', new Error());
    }
    const existingByEmail = await this.findByEmail(user.email);
    if (existingByEmail && !existingByEmail.id.equals(user.id)) {
      throw new AlreadyExistsException('email', user.email.toValue());
    }
    const existingByUsername = await this.findByUsername(user.username);
    if (existingByUsername && !existingByUsername.id.equals(user.id)) {
      throw new AlreadyExistsException('username', user.username.toValue());
    }

    this.users.set(user.id.toValue(), user.toValue());
  }

  async findById(id: Id) {
    if (this.shouldFail) {
      throw new InfrastructureException('findById', 'Repository operation failed', new Error());
    }
    const userDTO = this.users.get(id.toValue());
    return userDTO ? User.fromValue(userDTO) : null;
  }

  async findByEmail(email: Email) {
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

  async findByUsername(username: Username) {
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

  async existsByEmail(email: Email) {
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

  async existsByUsername(username: Username) {
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

  async findAll() {
    if (this.shouldFail) {
      throw new InfrastructureException('findAll', 'Repository operation failed', new Error());
    }
    return Array.from(this.users.values()).map((u) => User.fromValue(u));
  }

  async findByCriteria(criteria: Criteria) {
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

  async countByCriteria(criteria: Criteria) {
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

  async remove(id: Id) {
    if (this.shouldFail) {
      throw new InfrastructureException('remove', 'Repository operation failed', new Error());
    }
    this.users.delete(id.toValue());
  }

  async exists(id: Id) {
    if (this.shouldFail) {
      throw new InfrastructureException('exists', 'Repository operation failed', new Error());
    }
    return this.users.has(id.toValue());
  }

  async clear() {
    this.users.clear();
  }
}
