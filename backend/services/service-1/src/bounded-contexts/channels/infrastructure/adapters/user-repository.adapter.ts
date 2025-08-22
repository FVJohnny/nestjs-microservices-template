import { Injectable } from '@nestjs/common';
import { CorrelationLogger } from '@libs/nestjs-common';
import type {
  UserRepository,
  UserInfo,
} from '../../domain/repositories/user.repository';

/**
 * Adapter for accessing User data from the Users bounded context
 * This is a stub implementation - in a real system this would:
 * 1. Query a shared users database
 * 2. Make HTTP calls to a users service
 * 3. Use a shared repository
 * 4. Access user data through domain events/CQRS projections
 */
@Injectable()
export class UserRepositoryAdapter implements UserRepository {
  private readonly logger = new CorrelationLogger(UserRepositoryAdapter.name);

  // For demo purposes, maintain an in-memory list of valid users
  // In real implementation, this would be replaced with actual data access
  private readonly validUsers = new Set([
    'user-1',
    'user-123',
    'user-456',
    'gamer-456',
    'user-789',
    'support-team-789',
    'test-user',
    'user-events',
    'user-log',
    'user-error',
    'user-event-error',
  ]);

  async exists(userId: string): Promise<boolean> {
    this.logger.log(`Checking if user exists: ${userId}`);

    // Simulate some async work (database query, HTTP call, etc.)
    await this.simulateAsyncWork();

    const exists = this.validUsers.has(userId);

    this.logger.log(`User ${userId} exists: ${exists}`);
    return exists;
  }

  async findById(userId: string): Promise<UserInfo | null> {
    this.logger.log(`Finding user by id: ${userId}`);

    const exists = await this.exists(userId);
    if (!exists) {
      return null;
    }

    // Return mock user info
    return {
      id: userId,
      name: `User ${userId}`,
      isActive: true,
    };
  }

  /**
   * Add a user to the valid users list (for testing purposes)
   */
  addValidUser(userId: string): void {
    this.validUsers.add(userId);
    this.logger.log(`Added user ${userId} to valid users list`);
  }

  /**
   * Remove a user from the valid users list (for testing purposes)
   */
  removeValidUser(userId: string): void {
    this.validUsers.delete(userId);
    this.logger.log(`Removed user ${userId} from valid users list`);
  }

  private async simulateAsyncWork(): Promise<void> {
    // Simulate database query or HTTP call delay
    return new Promise((resolve) => setTimeout(resolve, 10));
  }
}
