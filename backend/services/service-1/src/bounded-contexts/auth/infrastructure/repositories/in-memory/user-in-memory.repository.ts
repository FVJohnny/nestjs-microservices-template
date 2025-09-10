import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user/user.entity';
import { UserRepository } from '../../../domain/repositories/user/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Criteria, InMemoryCriteriaConverter, PaginatedRepoResult } from '@libs/nestjs-common';
import { UserDTO } from '../../../domain/entities/user/user.types';

@Injectable()
export class UserInMemoryRepository implements UserRepository {
  private users: Map<string, UserDTO> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user.toValue());
  }

  async findById(id: string): Promise<User | null> {
    const userDTO = this.users.get(id);
    return userDTO ? User.fromValue(userDTO) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const userDTO of this.users.values()) {
      if (userDTO.email === email.toValue()) {
        return User.fromValue(userDTO);
      }
    }
    return Promise.resolve(null);
  }

  async findByUsername(username: Username): Promise<User | null> {
    for (const userDTO of this.users.values()) {
      if (userDTO.username === username.toValue()) {
        return User.fromValue(userDTO);
      }
    }
    return null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const userDTO = await this.findByEmail(email);
    return userDTO !== null;
  }

  async existsByUsername(username: Username): Promise<boolean> {
    const userDTO = await this.findByUsername(username);
    return userDTO !== null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).map((u) => User.fromValue(u));
  }

  async findByCriteria(criteria: Criteria): Promise<PaginatedRepoResult<User>> {
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
    const converter = new InMemoryCriteriaConverter(Array.from(this.users.values()));
    const count = await converter.count(criteria);
    return count;
  }

  async remove(id: string): Promise<void> {
    this.users.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.users.has(id);
  }
}
