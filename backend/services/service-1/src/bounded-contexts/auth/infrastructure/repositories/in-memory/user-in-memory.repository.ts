import { Injectable } from '@nestjs/common';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { User_Repository } from '@bc/auth/domain/repositories/user/user.repository';
import { Email, Username } from '@bc/auth/domain/value-objects';
import {
  AlreadyExistsException,
  Criteria,
  InMemoryCriteriaConverter,
  type RepositoryContext,
} from '@libs/nestjs-common';
import { UserDTO } from '@bc/auth/domain/entities/user/user.dto';
import { InMemoryBaseRepository } from '@libs/nestjs-common';

@Injectable()
export class User_InMemory_Repository
  extends InMemoryBaseRepository<User, UserDTO>
  implements User_Repository
{
  constructor(shouldFail: boolean = false) {
    super(shouldFail);
  }

  protected toEntity(dto: UserDTO): User {
    return User.fromValue(dto);
  }

  protected toValue(entity: User): UserDTO {
    return entity.toValue();
  }

  async findByEmail(email: Email) {
    super.validate('findByEmail');
    const values = await this.findAll();
    for (const user of values) {
      if (user.email.equals(email)) {
        return user;
      }
    }
    return null;
  }

  async findByUsername(username: Username) {
    super.validate('findByUsername');
    const values = await this.findAll();
    for (const user of values) {
      if (user.username.equals(username)) {
        return user;
      }
    }
    return null;
  }

  async existsByEmail(email: Email) {
    super.validate('existsByEmail');
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async existsByUsername(username: Username) {
    super.validate('existsByUsername');
    const user = await this.findByUsername(username);
    return user !== null;
  }

  async findByCriteria(criteria: Criteria) {
    super.validate('findByCriteria');
    const users = await this.findAll();
    const converter = new InMemoryCriteriaConverter(users.map((u) => u.toValue()));
    const queryResult = await converter.executeQuery(criteria);

    return Promise.resolve({
      data: queryResult.data.map((u) => User.fromValue(u)),
      total: criteria.hasWithTotal() ? queryResult.total : null,
      cursor: queryResult.cursor,
      hasNext: queryResult.hasNext,
    });
  }

  async countByCriteria(criteria: Criteria) {
    super.validate('countByCriteria');
    const users = await this.findAll();
    const converter = new InMemoryCriteriaConverter(users.map((u) => u.toValue()));
    const count = await converter.count(criteria);
    return count;
  }

  async save(user: User, context?: RepositoryContext) {
    const existingByEmail = await this.findByEmail(user.email);
    if (existingByEmail && !existingByEmail.id.equals(user.id)) {
      throw new AlreadyExistsException('email', user.email.toValue());
    }
    const existingByUsername = await this.findByUsername(user.username);
    if (existingByUsername && !existingByUsername.id.equals(user.id)) {
      throw new AlreadyExistsException('username', user.username.toValue());
    }

    await super.save(user, context);
  }
}
