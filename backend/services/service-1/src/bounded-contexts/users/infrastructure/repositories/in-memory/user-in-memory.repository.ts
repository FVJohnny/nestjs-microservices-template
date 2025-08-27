import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Criteria } from '@libs/nestjs-common';

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

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
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

  async existsByUsername(username: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return true;
      }
    }
    return false;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async findByCriteria(criteria: Criteria | any): Promise<User[]> {
    let users = Array.from(this.users.values());

    if (criteria.filters) {
      // Apply filters manually for in-memory implementation
      users = users.filter(user => {
        const primitives = user.toPrimitives();
        // Simple filter implementation - can be enhanced as needed
        return true; // For now, return all until proper filtering is implemented
      });
    }

    if (criteria.order) {
      users.sort((a, b) => {
        const aValue = (a as any)[criteria.order.orderBy];
        const bValue = (b as any)[criteria.order.orderBy];
        
        if (criteria.order.orderType === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    if (criteria.offset) {
      users = users.slice(criteria.offset);
    }

    if (criteria.limit) {
      users = users.slice(0, criteria.limit);
    }

    return users;
  }

  async countByCriteria(criteria: Criteria | any): Promise<number> {
    const users = await this.findByCriteria(criteria);
    return users.length;
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