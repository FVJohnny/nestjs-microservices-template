import { Pagination, PaginationType } from "./Pagination";

interface PaginationCursorProps {
  limit: number;
  after?: string;
  tiebrakerId?: string;
}
export class PaginationCursor extends Pagination {
  readonly limit: number;
  readonly after?: string;
  readonly tiebrakerId?: string;

  constructor(props: PaginationCursorProps = {limit: 10}) {
    super(PaginationType.Cursor);

    this.limit = props.limit;
    this.after = props.after;
    this.tiebrakerId = props.tiebrakerId;
  }
}
