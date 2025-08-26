import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('channels')
@Index('idx_channels_user_id', ['userId'])
@Index('idx_channels_channel_type', ['channelType'])
@Index('idx_channels_is_active', ['isActive'])
export class PostgreSQLChannelEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  channelType: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  connectionConfig: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
