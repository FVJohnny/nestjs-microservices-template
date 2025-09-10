export class LoginUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

export interface LoginUserCommandResponse {
  userId: string;
  email: string;
  username: string;
  role: string;
}