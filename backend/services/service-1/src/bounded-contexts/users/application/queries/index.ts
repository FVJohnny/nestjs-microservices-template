export * from './get-user-by-id/get-user-by-id.query';
export * from './get-user-by-id/get-user-by-id.query-handler';
export * from './get-user-by-id/get-user-by-id.response';
export * from './get-users/get-users.query';
export * from './get-users/get-users.query-handler';
export * from './get-users/get-users.response';

// Auto-export handlers array for easy module registration
import { GetUserByIdQueryHandler } from './get-user-by-id/get-user-by-id.query-handler';
import { GetUsersQueryHandler } from './get-users/get-users.query-handler';

export const QUERY_HANDLERS = [
  GetUserByIdQueryHandler,
  GetUsersQueryHandler,
];