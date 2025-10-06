import type { SharedAggregateRootDTO } from '@libs/nestjs-common';

export interface UserTokenDTO extends SharedAggregateRootDTO {
  userId: string;
  token: string;
  type: string;
}
