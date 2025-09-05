export type PaginationOrder = 'asc' | 'desc' | 'none';

export interface PaginationOffsetParams {
  limit?: number;
  offset?: number;
  withTotal?: boolean;
  sort: {
    field?: string;
    order?: PaginationOrder;
  };
}

export interface OffsetPageResultPagination {
  hasNext: boolean;
  total?: number | null; // optional
}

export interface OffsetPageResult<T> {
  data: T[];
  pagination: OffsetPageResultPagination;
}