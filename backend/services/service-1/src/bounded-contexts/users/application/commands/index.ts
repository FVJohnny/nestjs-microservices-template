export * from './register-user/register-user.command';
export * from './register-user/register-user.command-handler';
export * from './register-user/register-user.response';
export * from './update-user-profile/update-user-profile.command';
export * from './update-user-profile/update-user-profile.command-handler';

// Auto-export handlers array for easy module registration
import { RegisterUserCommandHandler } from './register-user/register-user.command-handler';
import { UpdateUserProfileCommandHandler } from './update-user-profile/update-user-profile.command-handler';

export const COMMAND_HANDLERS = [
  RegisterUserCommandHandler,
  UpdateUserProfileCommandHandler,
];