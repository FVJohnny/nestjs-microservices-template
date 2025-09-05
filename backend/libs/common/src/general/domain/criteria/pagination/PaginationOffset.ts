import { Pagination, PaginationType } from "./Pagination";

export class PaginationOffset extends Pagination {
  readonly limit: number;
  readonly offset: number;
  readonly withTotal: boolean;

  constructor(limit: number = 10, offset: number = 0, withTotal: boolean = false) {
    super(PaginationType.Offset);

    this.limit = limit;
    this.offset = offset;
    this.withTotal = withTotal;
  }
}
