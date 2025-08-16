import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'channels' })
export class ChannelMongoDocument extends Document {
  @Prop({ required: true, unique: true })
  declare id: string;

  @Prop({
    required: true,
    minlength: 1,
    maxlength: 100,
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    enum: ['telegram', 'discord', 'whatsapp'],
    lowercase: true,
  })
  channelType: string;

  @Prop({
    required: true,
    index: true, // Index for faster queries by userId
  })
  userId: string;

  @Prop({
    type: Object,
    default: {}, // Connection configuration for the channel
  })
  connectionConfig: Record<string, any>;

  @Prop({
    default: true,
    index: true, // Index for filtering active channels
  })
  isActive: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ChannelMongoSchema = SchemaFactory.createForClass(ChannelMongoDocument);

// Add indexes for common queries
ChannelMongoSchema.index({ userId: 1, isActive: 1 });
ChannelMongoSchema.index({ channelType: 1, isActive: 1 });
