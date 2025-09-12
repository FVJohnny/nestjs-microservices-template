export class RefreshTokenCommand {
  constructor(public readonly refreshToken: string) {}
}

export interface RefreshTokenCommandResponse {
  userId: string;
  email: string;
  username: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}
