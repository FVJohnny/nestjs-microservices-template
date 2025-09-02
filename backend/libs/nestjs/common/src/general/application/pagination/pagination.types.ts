export type PaginationOrder = 'asc' | 'desc';

export interface SortParam {
  field: string;         // must be validated/whitelisted per endpoint
  order: PaginationOrder;
}

export interface OffsetPageParams {
  limit?: number;        // default 20, max 100
  offset?: number;       // default 0
  sort?: SortParam;      // default { field:'createdAt', order:'desc' }
}

export interface CursorPageParams {
  limit?: number;
  after?: string;        // opaque cursor
  before?: string;       // optional
  sort?: SortParam;
}

export interface OffsetPageResult<T> {
  data: T[];
  pagination: {
    kind: 'offset';
    limit: number;
    offset: number;
    hasNext: boolean;
    total?: number | null; // optional
  }
}