import { Pagination, PaginationType } from "./Pagination";

interface PaginationCursorProps {
  limit?: number;
  cursor?: string;
}
export class PaginationCursor extends Pagination {
  readonly limit: number;
  readonly cursor?: string;

  constructor(props: PaginationCursorProps = {}) {
    super(PaginationType.Cursor);

    this.limit = props.limit ?? 10;
    this.cursor = props.cursor;
  }

  decodeCursor() {
    return JSON.parse(Buffer.from(this.cursor!, 'base64url').toString('utf-8')) as { after: string, tiebreakerId: string };
  }

  static encodeCursor(after: string, tiebreakerId: string) {
    return Buffer.from(JSON.stringify({ after, tiebreakerId })).toString('base64url');
  }
}
