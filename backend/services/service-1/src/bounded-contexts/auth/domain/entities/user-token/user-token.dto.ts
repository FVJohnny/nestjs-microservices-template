import type { SharedAggregateRootDTO } from '@libs/nestjs-common';

export interface UserTokenDTO extends SharedAggregateRootDTO {
  token: string;
  userId: string;
  type: string;
}
