import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserStatusEnum } from '../../../domain/value-objects/user-status.vo';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';

export type UserDocument = UserMongo & Document;

@Schema({ collection: 'users', timestamps: true })
export class UserMongo {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, enum: UserStatusEnum, default: UserStatusEnum.ACTIVE })
  status: UserStatusEnum;

  @Prop({ required: true, type: [String], enum: UserRoleEnum, default: [UserRoleEnum.USER] })
  roles: UserRoleEnum[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserMongo);