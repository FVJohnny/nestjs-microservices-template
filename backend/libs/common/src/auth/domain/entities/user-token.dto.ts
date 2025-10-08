import type { SharedAggregateRootDTO } from '../../../general/domain/aggregate-root';

export interface UserTokenDTO extends SharedAggregateRootDTO {
  userId: string;
  token: string;
  type: string;
}
