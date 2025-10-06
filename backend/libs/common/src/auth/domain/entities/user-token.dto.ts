import type { SharedAggregateRootDTO } from '../../../general/domain/entities/AggregateRoot';

export interface UserTokenDTO extends SharedAggregateRootDTO {
  userId: string;
  token: string;
  type: string;
}
