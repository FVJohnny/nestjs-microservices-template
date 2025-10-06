import { DateVO, Id, Timestamps } from '@libs/nestjs-common';
import { SharedAggregateRoot } from '@libs/nestjs-common';
import type { UserTokenDTO } from './user-token.dto';
import { Token } from './token.vo';
import { TokenType } from './token-type.vo';

export interface UserTokenAttributes {
  id: Id;
  token: Token;
  userId: Id;
  type: TokenType;
  timestamps: Timestamps;
}

export interface CreateUserTokenProps {
  token: string;
  userId: Id;
  type: 'access' | 'refresh';
}

export class UserToken extends SharedAggregateRoot {
  token: Token;
  userId: Id;
  type: TokenType;

  constructor(props: UserTokenAttributes) {
    super(props.id, props.timestamps);
    this.token = props.token;
    this.userId = props.userId;
    this.type = props.type;
  }

  static create(props: CreateUserTokenProps): UserToken {
    const token = new UserToken({
      id: Id.random(),
      token: new Token(props.token),
      userId: props.userId,
      type: new TokenType(props.type),
      timestamps: Timestamps.create(),
    });

    return token;
  }

  static fromValue(value: UserTokenDTO): UserToken {
    return new UserToken({
      id: new Id(value.id),
      token: new Token(value.token),
      userId: new Id(value.userId),
      type: new TokenType(value.type as 'access' | 'refresh'),
      timestamps: new Timestamps(new DateVO(value.createdAt), new DateVO(value.updatedAt)),
    });
  }

  toValue(): UserTokenDTO {
    return {
      ...super.toValue(),
      token: this.token.toValue(),
      userId: this.userId.toValue(),
      type: this.type.toValue(),
    };
  }
}
