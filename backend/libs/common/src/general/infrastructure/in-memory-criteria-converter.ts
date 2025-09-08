import {
  compareValues,
  getNestedValue,
  parseFromString,
} from "../../utils/data";
import type { Criteria } from "../domain/criteria/Criteria";
import type { Filter } from "../domain/criteria/filters/Filter";
import { Operator } from "../domain/criteria/filters/FilterOperator";
import type { Order } from "../domain/criteria/order/Order";
import { PaginationCursor } from "../domain/criteria/pagination/PaginationCursor";
import { PaginationOffset } from "../domain/criteria/pagination/PaginationOffset";
import type {
  SharedAggregateRoot,
  SharedAggregateRootDTO,
} from "../domain/entities/AggregateRoot";
import { Primitives } from "../domain/value-object/ValueObject";

export interface InMemoryFilterResult<T> {
  filterFn: (items: T[]) => T[];
  sortFn: (a: T, b: T) => number;
  paginationFn: (items: T[]) => {
    data: T[];
    total: number | null;
    hasNext?: boolean;
  };
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
  static query<T extends SharedAggregateRoot>(
    items: T[],
    criteria: Criteria,
  ): InMemoryQueryResult<T> {
    const { filterFn, sortFn, paginationFn } = this.convert<T>(criteria);

    let filteredItems = filterFn(items);

    filteredItems = filteredItems.sort(sortFn);

    const paginatedResults = paginationFn(filteredItems);

    // Generate cursor from the last element's orderBy field value
    const cursor = this.generateCursor(paginatedResults.data, criteria);

    return {
      ...paginatedResults,
      cursor,
    };
  }

  /**
   * Count items in an in-memory array with criteria (without pagination)
   */
  static count<T extends SharedAggregateRoot>(
    items: T[],
    criteria: Criteria,
  ): number {
    const { filterFn } = this.convert(criteria);
    return filterFn(items).length;
  }

  /**
   * Convert a Criteria object to in-memory filter functions
   */
  static convert<T extends SharedAggregateRoot>(
    criteria: Criteria,
  ): InMemoryFilterResult<T> {
    const shouldSort = criteria.order.hasOrder();

    return {
      filterFn: (items: T[]) => this.applyFilters<T>(items, criteria),
      sortFn: shouldSort
        ? (a: T, b: T) => this.applySorting(a, b, criteria.order)
        : () => 0,
      paginationFn: (items: T[]) => this.applyPagination<T>(items, criteria),
    };
  }

  private static applyFilters<T extends SharedAggregateRoot>(
    items: T[],
    criteria: Criteria,
  ): T[] {
    if (!criteria.hasFilters()) {
      return items;
    }

    return items.filter((item) => {
      const primitives = item.toValue();

      return criteria.filters.filters.every((filter: Filter) => {
        const field = filter.field.toValue();
        const operator = filter.operator.toValue();
        const filterValue = filter.value.toValue();

        return this.matchesFilter(primitives, field, operator, filterValue);
      });
    });
  }

  private static matchesFilter(
    primitives: SharedAggregateRootDTO,
    field: string,
    operator: string,
    filterValue: unknown,
  ): boolean {
    // Get value from nested path
    let userValue = getNestedValue(primitives, field);

    if (userValue === undefined || userValue === null) {
      return false;
    }

    if (Array.isArray(userValue)) {
      userValue = userValue.join(",");
    }

    return this.applyOperator(userValue, operator, filterValue);
  }

  private static applyOperator(
    userValue: unknown,
    operator: string,
    filterValue: unknown,
  ): boolean {
    // For string operations (CONTAINS, NOT_CONTAINS), use raw string values
    if (operator === Operator.CONTAINS || operator === Operator.NOT_CONTAINS) {
      const userStr = String(userValue);
      const filterStr = String(filterValue);

      switch (operator) {
        case Operator.CONTAINS:
          return userStr.toLowerCase().includes(filterStr.toLowerCase());
        case Operator.NOT_CONTAINS:
          return !userStr.toLowerCase().includes(filterStr.toLowerCase());
      }
    }

    // For other operations, parse values for proper type comparison
    const a = parseFromString(String(userValue));
    const b = parseFromString(String(filterValue));

    switch (operator) {
      case Operator.EQUAL:
        return compareValues(a, b) === 0;
      case Operator.NOT_EQUAL:
        return compareValues(a, b) !== 0;
      case Operator.GT:
        return compareValues(a, b) > 0;
      case Operator.LT:
        return compareValues(a, b) < 0;
      default:
        return true;
    }
  }

  private static applySorting(
    a: SharedAggregateRoot,
    b: SharedAggregateRoot,
    order: Order,
  ): number {
    const aPrimitives = a.toValue();
    const bPrimitives = b.toValue();
    const orderBy = order.orderBy.toValue();

    const aValue = getNestedValue(aPrimitives, orderBy);
    const bValue = getNestedValue(bPrimitives, orderBy);

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const comparison = compareValues(aValue, bValue);
    const dir = order.orderType.isAsc() ? 1 : -1;

    if (comparison !== 0) {
      return dir * comparison;
    }

    // If values are equal, sort by id
    const aId = getNestedValue(aPrimitives, "id");
    const bId = getNestedValue(bPrimitives, "id");

    if (aId === null || aId === undefined) return 1;
    if (bId === null || bId === undefined) return -1;

    return dir * compareValues(aId, bId);
  }

  private static applyPagination<T extends SharedAggregateRoot>(
    items: T[],
    criteria: Criteria,
  ): { data: T[]; total: number | null; hasNext?: boolean } {
    let result = items;
    let total: number | null = null;
    let hasNext: boolean | undefined;

    if (criteria.pagination instanceof PaginationOffset) {
      const off = criteria.pagination.offset;
      const lim = criteria.pagination.limit;
      if (criteria.pagination.withTotal) total = items.length;

      if (lim === 0) {
        // limit=0 means no limit, return all items after offset
        result = items.slice(off);
        hasNext = false;
      } else {
        const window = items.slice(off, off + lim + 1); // +1 peek
        hasNext = window.length > lim;
        result = window.slice(0, lim);
      }
    }

    if (criteria.pagination instanceof PaginationCursor) {
      // first, apply the seek to drop items before the cursor
      const seeked = this.applyCursorPagination<T>(items, criteria);
      const lim = criteria.pagination.limit ?? seeked.length;

      // For cursor pagination, limit=0 means return 0 items
      if (lim === 0) {
        result = [];
        hasNext = false;
      } else {
        const window = seeked.slice(0, lim + 1); // +1 peek
        hasNext = window.length > lim;
        result = window.slice(0, lim);
      }
    }

    return { data: result, total, hasNext };
  }

  private static applyCursorPagination<T extends SharedAggregateRoot>(
    items: T[],
    criteria: Criteria,
  ): T[] {
    if (
      !(criteria.pagination instanceof PaginationCursor) ||
      !criteria.order.hasOrder() ||
      !criteria.pagination.cursor
    ) {
      return items;
    }

    const orderBy = criteria.order.orderBy.toValue();
    const isDesc = criteria.order.orderType.isDesc();
    const cursor = criteria.pagination.decodeCursor();

    return items.filter((item) => {
      const primitives = item.toValue();
      const itemValue = getNestedValue(primitives, orderBy);
      const itemId = getNestedValue(primitives, "id");

      if (itemValue === undefined || itemValue === null) {
        return false;
      }

      // Convert values to comparable types
      const parsedItemValue = parseFromString(String(itemValue));
      const parsedAfter = parseFromString(String(cursor.after));

      // With tiebreaker: handle ties using ID
      if (isDesc) {
        return (
          compareValues(parsedItemValue, parsedAfter) < 0 ||
          (compareValues(parsedItemValue, parsedAfter) === 0 &&
            String(itemId) < cursor.tiebreakerId)
        );
      } else {
        return (
          compareValues(parsedItemValue, parsedAfter) > 0 ||
          (compareValues(parsedItemValue, parsedAfter) === 0 &&
            String(itemId) > cursor.tiebreakerId)
        );
      }
    });
  }

  private static generateCursor<T extends SharedAggregateRoot>(
    data: T[],
    criteria: Criteria,
  ): string | undefined {
    if (data.length == 0 || !criteria.order.hasOrder()) {
      return undefined;
    }

    const lastItem = data[data.length - 1];
    const orderByField = criteria.order.orderBy.toValue();
    const lastItemValue = lastItem.toValue();
    const cursorValue = lastItemValue[orderByField] as Primitives;
    const tiebreakerId = String(lastItemValue.id);

    return PaginationCursor.encodeCursor(String(cursorValue), tiebreakerId);
  }
}
