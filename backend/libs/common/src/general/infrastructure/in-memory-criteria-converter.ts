import type { Criteria } from '../domain/criteria/Criteria';
import type { Filter } from '../domain/criteria/Filter';
import { Operator } from '../domain/criteria/FilterOperator';
import type { Order } from '../domain/criteria/Order';
import type { SharedAggregateRoot, SharedAggregateRootDTO } from '../domain/entities/AggregateRoot';

export interface InMemoryFilterResult<T> {
  filterFn: (items: T[]) => T[];
  sortFn?: (a: T, b: T) => number;
  paginationFn: (items: T[]) => T[];
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
      paginationFn: (items: T[]) => this.applyPagination(items, criteria.offset, criteria.limit),
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

  private static applyPagination<T>(items: T[], offset?: number, limit?: number): T[] {
    let result = items;
    
    if (offset) {
      result = result.slice(offset);
    }
    
    if (limit) {
      result = result.slice(0, limit);
    }
    
    return result;
  }
}