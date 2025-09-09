import type { Criteria, CriteriaQueryResult, SharedAggregateRootDTO } from '@libs/nestjs-common';
import {
  Data,
  type Filter,
  Operator,
  PaginationCursor,
  PaginationOffset,
} from '@libs/nestjs-common';
import { CriteriaConverter } from '@libs/nestjs-common';
import { type Collection } from 'mongodb';

/**
 * MongoDB query options interface
 */
interface MongoQueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

/**
 * MongoDB filter condition interface
 */
interface MongoFilterCondition extends Record<string, unknown> {
  [field: string]: unknown;
  $or?: MongoFilterCondition[];
  $and?: MongoFilterCondition[];
}

/**
 * MongoDB criteria conversion result
 */
interface MongoCriteriaResult {
  filters: MongoFilterCondition[];
  options: MongoQueryOptions;
}

/**
 * Converts DDD Criteria to MongoDB filter objects
 */
export class MongoCriteriaConverter<D extends SharedAggregateRootDTO> extends CriteriaConverter<D> {
  constructor(private readonly collection: Collection<D>) {
    super();
  }
  /**
   * Query a MongoDB collection with criteria and return configured cursor
   */
  query(criteria: Criteria) {
    const { filters: filter, options } = this.convert(criteria);
    const mongoFilter = filter.length === 0 ? {} : { $and: filter };

    return this.collection.find(mongoFilter, options);
  }

  /**
   * Execute a full query with metadata including cursor and hasNext
   */
  async executeQuery(criteria: Criteria): Promise<CriteriaQueryResult<D>> {
    const query = this.query(criteria.withExtraLimit());
    let documents = (await query.toArray()) as D[];

    // Check if we got more documents than requested
    const hasNext = criteria.hasLimit() && documents.length > criteria.pagination.limit;

    // Trim to actual limit
    if (criteria.pagination.limit > 0) {
      documents = documents.slice(0, criteria.pagination.limit);
    }
    const total = criteria.hasWithTotal() ? await this.count(criteria) : null;
    const cursor = this.generateCursor(documents, criteria);

    return {
      data: documents,
      total,
      cursor,
      hasNext,
    };
  }

  /**
   * Count documents in a MongoDB collection with criteria
   */
  async count(criteria: Criteria): Promise<number> {
    const { filters } = this.convert(criteria.withNoPagination());
    const mongoFilter = filters.length === 0 ? {} : { $and: filters };

    return this.collection.countDocuments(mongoFilter);
  }

  /**
   * Convert a Criteria object to MongoDB filter and options
   */
  convert(criteria: Criteria): MongoCriteriaResult {
    const options: MongoQueryOptions = {};
    const filters = this.buildFilters(criteria);

    options.sort = this.buildSortOptions(criteria);
    if (criteria.pagination.limit !== 0) {
      options.limit = criteria.pagination.limit;
    }

    if (criteria.pagination instanceof PaginationOffset) {
      options.skip = criteria.pagination.offset;
    }

    if (criteria.pagination instanceof PaginationCursor) {
      options.limit = criteria.pagination.limit;
      const cursorFilter = this.buildCursorFilter(criteria);
      if (cursorFilter) {
        filters.push(cursorFilter);
      }
    }

    return { filters, options };
  }

  private buildFilters(criteria: Criteria): MongoFilterCondition[] {
    if (!criteria.hasFilters()) {
      return [];
    }

    const filters: MongoFilterCondition[] = [];

    criteria.filters.filters.forEach((filterObj: Filter) => {
      const fieldName = filterObj.field.toValue();
      const operator = filterObj.operator.toValue();
      const value = filterObj.value.toValue();

      const condition: MongoFilterCondition = {};

      switch (operator) {
        case Operator.EQUAL:
          condition[fieldName] = Data.parseFromString(value);
          break;
        case Operator.NOT_EQUAL:
          condition[fieldName] = { $ne: Data.parseFromString(value) };
          break;
        case Operator.CONTAINS:
          condition[fieldName] = { $regex: value, $options: 'i' };
          break;
        case Operator.NOT_CONTAINS:
          condition[fieldName] = { $not: { $regex: value, $options: 'i' } };
          break;
        case Operator.GT:
          condition[fieldName] = { $gt: Data.parseFromString(value) };
          break;
        case Operator.LT:
          condition[fieldName] = { $lt: Data.parseFromString(value) };
          break;
      }

      filters.push(condition);
    });

    return filters;
  }

  private buildCursorFilter(criteria: Criteria): MongoFilterCondition | undefined {
    if (!(criteria.pagination instanceof PaginationCursor)) {
      return undefined;
    }

    // Check if cursor exists
    if (!criteria.pagination.cursor) {
      return undefined;
    }

    const orderByValue = criteria.order.orderBy?.toValue();
    const cursor = criteria.pagination.decodeCursor();

    const comparator = criteria.order.orderType.isAsc() ? '$gt' : '$lt';

    return {
      $or: [
        { [orderByValue]: { [comparator]: Data.parseFromString(cursor.after) } },
        {
          [orderByValue]: Data.parseFromString(cursor.after),
          id: { [comparator]: cursor.tiebreakerId },
        },
      ],
    };
  }

  private buildSortOptions(criteria: Criteria): Record<string, 1 | -1> | undefined {
    if (!criteria.order.hasOrder()) {
      return undefined;
    }

    const sortOrder = criteria.order.orderType.isAsc() ? 1 : -1;
    const sort: Record<string, 1 | -1> = {
      [criteria.order.orderBy.toValue()]: sortOrder,
    };

    // Add id as tiebreaker for cursor pagination
    if (criteria.pagination instanceof PaginationCursor) {
      sort.id = sortOrder;
    }

    return sort;
  }
}
