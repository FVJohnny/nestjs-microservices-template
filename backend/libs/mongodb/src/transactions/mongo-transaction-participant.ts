import type { MongoClient, ClientSession } from 'mongodb';
import type { TransactionParticipant } from '@libs/nestjs-common';

export class MongoTransactionParticipant implements TransactionParticipant {
  private readonly session: ClientSession;
  constructor(mongoClient: MongoClient) {
    this.session = mongoClient.startSession();
  }

  getSession(): ClientSession {
    return this.session;
  }

  async commit() {
    await this.session.commitTransaction();
  }

  async rollback() {
    await this.session.abortTransaction();
  }

  async dispose() {
    await this.session.endSession();
  }
}
