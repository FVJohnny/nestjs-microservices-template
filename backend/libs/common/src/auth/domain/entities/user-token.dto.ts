import type { SharedAggregateRootDTO } from '../../../general/domain/base.aggregate-root';

export interface UserTokenDTO extends SharedAggregateRootDTO {
  userId: string;
  token: string;
  type: string;
}
