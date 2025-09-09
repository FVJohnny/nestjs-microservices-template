import type { Criteria } from './Criteria';
import type { SharedAggregateRootDTO } from '../entities/AggregateRoot';
import type { Primitives } from '../value-object/ValueObject';
import { PaginationCursor } from './pagination/PaginationCursor';

export interface CriteriaQueryResult<D extends SharedAggregateRootDTO> {
  data: D[];
  total: number | null;
  hasNext?: boolean;
  cursor?: string;
}
export abstract class CriteriaConverter<D extends SharedAggregateRootDTO> {
  abstract executeQuery(criteria: Criteria): Promise<CriteriaQueryResult<D>>;
  abstract count(criteria: Criteria): Promise<number>;

  public generateCursor(documents: D[], criteria: Criteria): string | undefined {
    if (documents.length === 0 || !criteria.order.hasOrder()) {
      return undefined;
    }

    const lastItem = documents[documents.length - 1];
    const orderByField = criteria.order.orderBy.toValue();
    const cursorValue = lastItem[orderByField] as Primitives;
    const tiebreakerId = String(lastItem.id);

    return PaginationCursor.encodeCursor(String(cursorValue), tiebreakerId);
  }
}
