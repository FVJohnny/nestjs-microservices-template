export type PaginationOrder = 'asc' | 'desc' | 'none';

export interface SortParam {
  field: string;         // must be validated/whitelisted per endpoint
  order: PaginationOrder;
}

export interface OffsetPageParams {
  limit?: number;        // default 20, max 100
  offset?: number;       // default 0
  sort?: SortParam;      // default { field:'createdAt', order:'desc' }
  withTotal?: boolean;  // default false
}

export interface CursorPageParams {
  limit?: number;
  after?: string;        // opaque cursor
  before?: string;       // optional
  sort?: SortParam;
}


export interface OffsetPageResultPagination {
  kind: 'offset';
  limit: number;
  offset: number;
  hasNext: boolean;
  total?: number | null; // optional
}

export interface OffsetPageResult<T> {
  data: T[];
  pagination: OffsetPageResultPagination;
}