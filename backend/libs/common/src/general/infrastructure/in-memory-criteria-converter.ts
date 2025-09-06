import type { Criteria } from '../domain/criteria/Criteria';
import type { Filter } from '../domain/criteria/filters/Filter';
import { Operator } from '../domain/criteria/filters/FilterOperator';
import type { Order } from '../domain/criteria/order/Order';
import { PaginationCursor } from '../domain/criteria/pagination/PaginationCursor';
import { PaginationOffset } from '../domain/criteria/pagination/PaginationOffset';
import type { SharedAggregateRoot, SharedAggregateRootDTO } from '../domain/entities/AggregateRoot';

export interface InMemoryFilterResult<T> {
  filterFn: (items: T[]) => T[];
  sortFn: (a: T, b: T) => number;
  paginationFn: (items: T[]) => {data: T[], total: number | null, hasNext?: boolean};
}

export interface InMemoryQueryResult<T> {
  data: T[];
  total: number | null;
  hasNext?: boolean;
  cursor?: string;
}

/**
 * Converts DDD Criteria to in-memory filtering, sorting and pagination functions
 * Generic implementation that works with any entity that has toValue() method
 */
export class InMemoryCriteriaConverter {
  /**
   * Query an in-memory array with criteria and return filtered, sorted, and paginated results
   */
  static query<T extends SharedAggregateRoot>(items: T[], criteria: Criteria): InMemoryQueryResult<T> {
    const { filterFn, sortFn, paginationFn } = this.convert<T>(criteria);
    
    let filteredItems = filterFn(items);
    
    filteredItems = filteredItems.sort(sortFn);
    
    const paginatedResults = paginationFn(filteredItems);
    
    // Generate cursor from the last element's orderBy field value
    let cursor: string | undefined;
    if (paginatedResults.data.length > 0 && criteria.order.hasOrder()) {
      cursor = this.generateCursor(paginatedResults.data, criteria);
    }
    
    return {
      ...paginatedResults,
      cursor,
    };
  }

  /**
   * Alias for query method - kept for backward compatibility
   */
  static apply<T extends SharedAggregateRoot>(items: T[], criteria: Criteria): InMemoryQueryResult<T> {
    return this.query(items, criteria);
  }

  /**
   * Count items in an in-memory array with criteria (without pagination)
   */
  static count<T extends SharedAggregateRoot>(items: T[], criteria: Criteria): number {
    const { filterFn } = this.convert(criteria);
    return filterFn(items).length;
  }

  /**
   * Convert a Criteria object to in-memory filter functions
   */
  static convert<T extends SharedAggregateRoot>(criteria: Criteria): InMemoryFilterResult<T> {
    const shouldSort = criteria.order && 
                      criteria.order.orderBy.toValue().trim() !== '' && 
                      criteria.order.orderType.toValue() !== 'none';
    
    return {
      filterFn: (items: T[]) => this.applyFilters<T>(items, criteria),
      sortFn: shouldSort ? (a: T, b: T) => this.applySorting(a, b, criteria.order!) : () => 0,
      paginationFn: (items: T[]) => this.applyPagination<T>(items, criteria),
    };
  }

  private static applyFilters<T extends SharedAggregateRoot>(items: T[], criteria: Criteria): T[] {
    if (!criteria.hasFilters()) {
      return items;
    }

    return items.filter(item => {
      const primitives = item.toValue();
      
      return criteria.filters.filters.every((filter: Filter) => {
        const field = filter.field.toValue();
        const operator = filter.operator.toValue();
        const filterValue = filter.value.toValue();
        
        return this.matchesFilter(primitives, field, operator, filterValue);
      });
    });
  }

  private static matchesFilter(primitives: SharedAggregateRootDTO, field: string, operator: string, filterValue: unknown): boolean {
    // Get value from nested path
    let userValue = this.getNestedValue(primitives, field);
    
    if (userValue === undefined || userValue === null) {
      return false;
    }
    
    if (Array.isArray(userValue)) {
      userValue = userValue.join(',');
    }

    return this.applyOperator(userValue, operator, filterValue, field);
  }

  private static getNestedValue(obj: object, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private static applyOperator(userValue: unknown, operator: string, filterValue: unknown, field: string): boolean {
    const userValueStr = String(userValue).toLowerCase();
    const filterValueStr = String(filterValue).toLowerCase();

    switch (operator) {
      case Operator.EQUAL:
        return userValueStr === filterValueStr;
      case Operator.NOT_EQUAL:
        return userValueStr !== filterValueStr;
      case Operator.GT:
        return this.isDateField(field) 
          ? new Date(String(userValue)) > new Date(String(filterValue))
          : Number(userValue) > Number(filterValue);
      case Operator.LT:
        return this.isDateField(field)
          ? new Date(String(userValue)) < new Date(String(filterValue))
          : Number(userValue) < Number(filterValue);
      case Operator.CONTAINS:
        return userValueStr.includes(filterValueStr);
      case Operator.NOT_CONTAINS:
        return !userValueStr.includes(filterValueStr);
      default:
        return true;
    }
  }

  private static isDateField(field: string): boolean {
    const dateFieldPatterns = [
      /.*at$/i,        // createdAt, updatedAt, deletedAt, etc.
      /.*date$/i,      // startDate, endDate, etc.
      /.*time$/i,      // lastTime, accessTime, etc.
      /^date.*$/i,     // dateCreated, dateUpdated, etc.
      /^time.*$/i,     // timeCreated, timeUpdated, etc.
    ];
    
    return dateFieldPatterns.some(pattern => pattern.test(field));
  }

  private static applySorting(a: SharedAggregateRoot, b: SharedAggregateRoot, order: Order): number {
    const aPrimitives = a.toValue();
    const bPrimitives = b.toValue();
    const orderBy = order.orderBy.toValue();
    
    const aValue = this.getNestedValue(aPrimitives, orderBy);
    const bValue = this.getNestedValue(bPrimitives, orderBy);
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return order.orderType.isAsc() ? comparison : -comparison;
  }

  private static applyPagination<T extends SharedAggregateRoot>(items: T[], criteria: Criteria)
  : {data: T[], total: number | null, hasNext?: boolean} {
    let result = items;
    let total = null;
    let hasNext: boolean | undefined;

    if (criteria.pagination instanceof PaginationOffset) {
      if (criteria.pagination.withTotal) {
        total = items.length;
      }
      if (criteria.pagination.offset) {
        result = result.slice(criteria.pagination.offset);
      }
      if (criteria.pagination.limit) {
        result = result.slice(0, criteria.pagination.limit);
      }
    }
    
    if (criteria.pagination instanceof PaginationCursor) {
      if (criteria.pagination.after && criteria.order) {
        result = this.applyCursorPagination<T>(result, criteria);
      }
      // For cursor pagination, handle limit=0 differently than offset pagination
      const shouldApplyLimit = criteria.pagination.limit !== undefined;
      if (shouldApplyLimit) {
        // Check if there are more items than the limit
        hasNext = criteria.pagination.limit > 0 && result.length > criteria.pagination.limit;
        result = result.slice(0, criteria.pagination.limit);
      }
    }
    
    return {data: result, total, hasNext};
  }

  private static applyCursorPagination<T extends SharedAggregateRoot>(items: T[], criteria: Criteria): T[] {
    const pagination = criteria.pagination as PaginationCursor;
    const orderBy = criteria.order!.orderBy.toValue();
    const isDesc = criteria.order!.orderType.toValue() === 'desc';
    const afterValue = this.parseFromString(pagination.after!);
    const tiebrakerId = pagination.tiebrakerId;
    
    return items.filter(item => {
      const primitives = item.toValue();
      const itemValue = this.getNestedValue(primitives, orderBy);
      const itemId = this.getNestedValue(primitives, 'id');
      
      if (itemValue === undefined || itemValue === null) {
        return false;
      }
      
      // Convert values to comparable types
      const parsedItemValue = this.parseFromString(String(itemValue));
      
      if (tiebrakerId) {
        // With tiebreaker: handle ties using ID
        if (isDesc) {
          // For descending order: include items where orderBy < afterValue OR (orderBy = afterValue AND id < tiebrakerId)
          return this.compareValues(parsedItemValue, afterValue) < 0 || 
                 (this.compareValues(parsedItemValue, afterValue) === 0 && String(itemId) < tiebrakerId);
        } else {
          // For ascending order: include items where orderBy > afterValue OR (orderBy = afterValue AND id > tiebrakerId)
          return this.compareValues(parsedItemValue, afterValue) > 0 || 
                 (this.compareValues(parsedItemValue, afterValue) === 0 && String(itemId) > tiebrakerId);
        }
      } else {
        // Without tiebreaker: simple comparison
        if (isDesc) {
          // For descending order: include items where orderBy < afterValue
          return this.compareValues(parsedItemValue, afterValue) < 0;
        } else {
          // For ascending order: include items where orderBy > afterValue
          return this.compareValues(parsedItemValue, afterValue) > 0;
        }
      }
    });
  }

  private static parseFromString(value: string): unknown {
    // Try to parse as number first
    const asNumber = Number(value);
    if (!isNaN(asNumber) && isFinite(asNumber)) {
      return asNumber;
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Try to parse as Date
    const asDate = new Date(value);
    if (!isNaN(asDate.getTime()) && value.match(/\d{4}-\d{2}-\d{2}/)) {
      return asDate;
    }
    
    // Return as string
    return value;
  }

  private static compareValues(a: unknown, b: unknown): number {
    // Handle null/undefined
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
    if (b === null || b === undefined) return 1;
    
    // If both are numbers, compare numerically
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    
    // If both are dates, compare by time
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    
    // If both are booleans, compare as numbers
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }
    
    // Default to string comparison
    return String(a).localeCompare(String(b));
  }

  private static generateCursor<T extends SharedAggregateRoot>(data: T[], criteria: Criteria): string | undefined {
    const lastItem = data[data.length - 1];
    const orderByField = criteria.order.orderBy.toValue();
    const lastItemValue = lastItem.toValue() as unknown as Record<string, unknown>;
    const cursorValue = lastItemValue[orderByField];
    
    return cursorValue != null && typeof cursorValue !== 'object'
      ? String(cursorValue as string)
      : undefined;
  }
}