export class GetNewTokensFromRefreshTokenQuery {
  constructor(public readonly refreshToken: string) {}
}

export interface GetNewTokensFromRefreshTokenQueryResponse {
  accessToken: string;
  refreshToken: string;
}
