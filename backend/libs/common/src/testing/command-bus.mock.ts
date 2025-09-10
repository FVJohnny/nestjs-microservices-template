import type { ICommand } from '@nestjs/cqrs';

export interface MockCommandBus {
  commands: ICommand[];
  shouldFail: boolean;
  execute: (command: ICommand) => Promise<unknown>;
}

export interface CreateCommandBusMockOptions {
  shouldFail?: boolean;
}

/**
 * Creates a mock CommandBus for testing purposes
 *
 * @param options Configuration options for the mock
 * @param options.shouldFail If true, execute method will throw errors
 * @returns MockCommandBus instance with captured commands and configurable failure behavior
 */
export function createCommandBusMock(options: CreateCommandBusMockOptions = {}): MockCommandBus {
  const { shouldFail = false } = options;

  const commands: ICommand[] = [];

  const executeMock = (command: ICommand) => {
    if (shouldFail) {
      throw new Error('CommandBus execute failed');
    }
    commands.push(command);
    return Promise.resolve({ success: true });
  };

  const mockCommandBus: MockCommandBus = {
    commands,
    shouldFail,
    execute: executeMock,
  };

  return mockCommandBus;
}