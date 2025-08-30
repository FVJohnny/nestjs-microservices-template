import { Filters } from './Filters';
import { Order } from './Order';


interface CriteriaProps {
  filters?: Filters;
  order?: Order;
  limit?: number;
  offset?: number;
}
export class Criteria {
  readonly filters: Filters;
  readonly order: Order;
  readonly limit?: number;
  readonly offset?: number;

  constructor(props: CriteriaProps = {}) {
    this.filters = props.filters || Filters.none();
    this.order = props.order || Order.none();
    this.limit = props.limit;
    this.offset = props.offset;
  }

  public hasFilters(): boolean {
    return this.filters.filters.length > 0;
  }
}
