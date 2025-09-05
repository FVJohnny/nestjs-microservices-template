import type { Criteria } from '../domain/criteria/Criteria';
import type { Filter } from '../domain/criteria/filters/Filter';
import { Operator } from '../domain/criteria/filters/FilterOperator';
import type { Order } from '../domain/criteria/order/Order';
import { PaginationCursor } from '../domain/criteria/pagination/PaginationCursor';
import { PaginationOffset } from '../domain/criteria/pagination/PaginationOffset';
import type { SharedAggregateRoot, SharedAggregateRootDTO } from '../domain/entities/AggregateRoot';

export interface InMemoryFilterResult<T> {
  filterFn: (items: T[]) => T[];
  sortFn?: (a: T, b: T) => number;
    paginationFn: (items: T[]) => {data: T[], total: number | null};
}

/**
 * Converts DDD Criteria to in-memory filtering, sorting and pagination functions
 * Generic implementation that works with any entity that has toValue() method
 */
export class InMemoryCriteriaConverter {
  /**
   * Convert a Criteria object to in-memory filter functions
   */
  static convert<T extends SharedAggregateRoot>(criteria: Criteria): InMemoryFilterResult<T> {
    return {
      filterFn: (items: T[]) => this.applyFilters(items, criteria),
      sortFn: criteria.order ? (a: T, b: T) => this.applySorting(a, b, criteria.order!) : undefined,
      paginationFn: (items: T[]) => this.applyPagination(items, criteria.pagination),
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

  private static applyPagination<T>(items: T[], pagination: PaginationOffset | PaginationCursor)
  : {data: T[], total: number | null} {
    let result = items;
    let total = null;

    if (pagination instanceof PaginationOffset) {
      if (pagination.withTotal) {
        total = items.length;
      }
      if (pagination.offset) {
        result = result.slice(pagination.offset);
      }
      if (pagination.limit) {
        result = result.slice(0, pagination.limit);
      }
    }
    
    if (pagination instanceof PaginationCursor) {
      if (pagination.after) {
        //result = result.slice(pagination.after);
      }
      if (pagination.limit) {
        result = result.slice(0, pagination.limit);
      }
    }
    
    return {data: result, total};
  }
}