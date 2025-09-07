import { Criteria, type Filter, Operator, PaginationCursor, PaginationOffset, parseFromString, Primitives } from '@libs/nestjs-common';
import { type Collection, type FindCursor, type Document, type WithId } from 'mongodb';

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
 * MongoDB query result with metadata
 */
export interface MongoQueryResult<T> {
  data: T[];
  total: number | null;
  hasNext?: boolean;
  cursor?: string;
}

/**
 * Converts DDD Criteria to MongoDB filter objects
 */
export class MongoCriteriaConverter {
  /**
   * Query a MongoDB collection with criteria and return configured cursor
   */
  static query<T extends Document = Document>(collection: Collection<T>, criteria: Criteria): FindCursor<WithId<T>> {
    const { filters: filter, options } = this.convert(criteria);
    const mongoFilter = filter.length === 0 ? {} : {$and: filter};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return collection.find(mongoFilter as any, options);
  }

  /**
   * Execute a full query with metadata including cursor and hasNext
   */
  static async executeQuery<T extends Document = Document>(
    collection: Collection<T>, 
    criteria: Criteria
  ): Promise<MongoQueryResult<WithId<T>>> {
    // Create a modified criteria with limit + 1 for hasNext detection
    let modifiedPagination = criteria.pagination;
    if (criteria.pagination.limit > 0) {
      if (criteria.pagination instanceof PaginationOffset) {
        modifiedPagination = new PaginationOffset(criteria.pagination.limit + 1, criteria.pagination.offset, criteria.pagination.withTotal);
      } else if (criteria.pagination instanceof PaginationCursor) {
        modifiedPagination = new PaginationCursor({ 
          cursor: criteria.pagination.cursor, 
          limit: criteria.pagination.limit + 1 
        });
      }
    }
    
    const modifiedCriteria = new Criteria({
      filters: criteria.filters,
      order: criteria.order,
      pagination: modifiedPagination
    });
    
    const query = this.query(collection, modifiedCriteria);
    const documents = await query.toArray();

    // Check if we got more documents than requested
    const hasNext = documents.length > criteria.pagination.limit && criteria.pagination.limit > 0;
    
    // Trim to actual limit
    const resultDocuments = hasNext 
      ? documents.slice(0, criteria.pagination.limit)
      : documents;

    const total = criteria.hasWithTotal() 
      ? await this.count(collection, criteria.withNoPagination())
      : null;

    // Generate cursor from the last element's orderBy field value
    const cursor = this.generateCursor(resultDocuments, criteria);

    return {
      data: resultDocuments,
      total,
      cursor,
      hasNext,
    };
  }

  /**
   * Count documents in a MongoDB collection with criteria
   */
  static async count<T extends Document = Document>(collection: Collection<T>, criteria: Criteria): Promise<number> {
    const { filters } = this.convert(criteria);
    const mongoFilter = filters.length === 0 ? {} : { $and: filters };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return collection.countDocuments(mongoFilter as any);
  }

  /**
   * Convert a Criteria object to MongoDB filter and options
   */
  static convert(criteria: Criteria): MongoCriteriaResult {
    const options: MongoQueryOptions = {};
    const filters = this.buildFilters(criteria);

    options.sort = this.buildSortOptions(criteria);

    if (criteria.pagination instanceof PaginationOffset) {
      options.limit = criteria.pagination.limit;
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

  private static generateCursor<T extends Document = Document>(
    documents: WithId<T>[], 
    criteria: Criteria
  ): string | undefined {

    if (documents.length == 0 || !criteria.order.hasOrder()) {
      return undefined;
    }
    const lastDocument = documents[documents.length - 1];
    const orderByField = criteria.order.orderBy.toValue();
    const cursorValue = lastDocument[orderByField] as Primitives;
    const tiebreakerId = lastDocument.id as string;

    return PaginationCursor.encodeCursor(cursorValue.toString(), tiebreakerId);
  }

  private static buildFilters(criteria: Criteria): MongoFilterCondition[] {
    const filters: MongoFilterCondition[] = [];
    
    if (!criteria.filters || criteria.filters.filters.length === 0) {
      return filters;
    }

    criteria.filters.filters.forEach((filterObj: Filter) => {
      const fieldName = filterObj.field.toValue();
      const operator = filterObj.operator.toValue();
      const value = filterObj.value.toValue();
      const condition: MongoFilterCondition = {};

      switch (operator) {
        case Operator.EQUAL:
          condition[fieldName] = parseFromString(value);
          break;
        case Operator.NOT_EQUAL:
          condition[fieldName] = { $ne: parseFromString(value) };
          break;
        case Operator.CONTAINS:
          condition[fieldName] = { $regex: value, $options: 'i' };
          break;
        case Operator.NOT_CONTAINS:
          condition[fieldName] = { $not: { $regex: value, $options: 'i' } };
          break;
        case Operator.GT:
          condition[fieldName] = { $gt: parseFromString(value) };
          break;
        case Operator.LT:
          condition[fieldName] = { $lt: parseFromString(value) };
          break;
      }
      
      filters.push(condition);
    });

    return filters;
  }

  private static buildCursorFilter(criteria: Criteria): MongoFilterCondition | undefined {
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
        { [orderByValue]: { [comparator]: parseFromString(cursor.after) } },
        { 
          [orderByValue]: parseFromString(cursor.after),
          id: { [comparator]: cursor.tiebreakerId } 
        },
      ],
    };
  }

  private static buildSortOptions(criteria: Criteria): Record<string, 1 | -1> | undefined {
    if (!criteria.order.hasOrder()) {
      return undefined;
    }
    
    const sortOrder = criteria.order.orderType.isAsc() ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [criteria.order.orderBy.toValue()]: sortOrder };
    
    // Add id as tiebreaker for cursor pagination
    if (criteria.pagination instanceof PaginationCursor) {
      sort.id = sortOrder;
    }
    
    return sort;
  }

}