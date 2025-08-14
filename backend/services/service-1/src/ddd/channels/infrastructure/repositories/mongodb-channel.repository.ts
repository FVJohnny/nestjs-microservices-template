import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel } from '../../domain/entities/channel.entity';
import { ChannelRepository } from '../../domain/repositories/channel.repository';
import { ChannelDocument } from '../schemas/channel.schema';
import { ChannelTypeVO } from '../../domain/value-objects/channel-type.vo';
import { CorrelationLogger } from '@libs/nestjs-common';

@Injectable()
export class MongoDBChannelRepository implements ChannelRepository {
  private readonly logger = new CorrelationLogger(
    MongoDBChannelRepository.name,
  );

  constructor(
    @InjectModel('Channel')
    private readonly channelModel: Model<ChannelDocument>,
  ) {}

  async save(channel: Channel): Promise<Channel> {
    try {
      const channelDoc = await this.channelModel.findOne({ id: channel.id });

      if (channelDoc) {
        // Update existing channel
        await this.channelModel.updateOne(
          { id: channel.id },
          {
            name: channel.name,
            channelType: channel.channelType.toString(),
            userId: channel.userId,
            connectionConfig: channel.connectionConfig,
            isActive: channel.isActive,
            updatedAt: new Date(),
          },
        );
        this.logger.log(`Updated channel: ${channel.id}`);
      } else {
        // Create new channel
        await this.channelModel.create({
          id: channel.id,
          name: channel.name,
          channelType: channel.channelType.toString(),
          userId: channel.userId,
          connectionConfig: channel.connectionConfig,
          isActive: channel.isActive,
          createdAt: channel.createdAt,
          updatedAt: new Date(),
        });
        this.logger.log(`Created channel: ${channel.id}`);
      }

      // Return the saved channel
      return channel;
    } catch (error) {
      this.logger.error(`Failed to save channel ${channel.id}`, error);
      throw new Error(
        `Failed to save channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findById(id: string): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel by id: ${id}`);
      const channelDoc = await this.channelModel.findOne({ id }).exec();
      return channelDoc ? this.toDomainEntity(channelDoc) : null;
    } catch (error) {
      this.logger.error(`Failed to find channel by id ${id}`, error);
      throw new Error(
        `Failed to find channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels for userId: ${userId}`);
      const channelDocs = await this.channelModel
        .find({ userId, isActive: true })
        .sort({ createdAt: -1 })
        .exec();

      return channelDocs.map((doc) => this.toDomainEntity(doc));
    } catch (error) {
      this.logger.error(`Failed to find channels by user id ${userId}`, error);
      throw new Error(
        `Failed to find channels by user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findAll(): Promise<Channel[]> {
    try {
      this.logger.log('Finding all channels');
      const channelDocs = await this.channelModel
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .exec();

      return channelDocs.map((doc) => this.toDomainEntity(doc));
    } catch (error) {
      this.logger.error(`Failed to find all channels`, error);
      throw new Error(
        `Failed to find all channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removing channel with id: ${id}`);
      // Soft delete by setting isActive to false
      const result = await this.channelModel.updateOne(
        { id },
        { isActive: false, updatedAt: new Date() },
      );

      if (result.matchedCount === 0) {
        throw new Error(`Channel with id ${id} not found`);
      }

      this.logger.log(`Soft deleted channel: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to remove channel ${id}`, error);
      throw new Error(
        `Failed to remove channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if channel exists with id: ${id}`);
      const count = await this.channelModel.countDocuments({
        id,
        isActive: true,
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if channel exists ${id}`, error);
      throw new Error(
        `Failed to check channel existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async count(): Promise<number> {
    try {
      this.logger.log('Counting channels');
      return await this.channelModel.countDocuments({ isActive: true });
    } catch (error) {
      this.logger.error(`Failed to count channels`, error);
      throw new Error(
        `Failed to count channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert MongoDB document to domain entity
   */
  private toDomainEntity(doc: ChannelDocument): Channel {
    return new Channel(
      doc.id,
      ChannelTypeVO.create(doc.channelType),
      doc.name,
      doc.userId,
      doc.connectionConfig || {},
      doc.isActive,
      doc.createdAt,
    );
  }
}
