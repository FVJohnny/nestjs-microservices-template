import { Filters } from './filters/Filters';
import { Order } from './order/Order';
import { PaginationOffset } from './pagination/PaginationOffset';
import { PaginationCursor } from './pagination/PaginationCursor';

interface CriteriaProps {
  filters?: Filters;
  order?: Order;
  pagination?: PaginationOffset | PaginationCursor;
}
export class Criteria implements CriteriaProps {
  readonly filters: Filters;
  readonly order: Order;
  readonly pagination: PaginationOffset | PaginationCursor;

  constructor(props: CriteriaProps = {}) {
    this.filters = props.filters || Filters.none();
    this.order = props.order || Order.none();
    this.pagination = props.pagination || new PaginationOffset();
  }

  public hasFilters(): boolean {
    return this.filters.filters.length > 0;
  }

  public hasWithTotal(): boolean {
    return this.pagination instanceof PaginationOffset && this.pagination.withTotal;
  }
}
