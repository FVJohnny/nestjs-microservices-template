import { type Criteria, type Filter, Operator, PaginationCursor, PaginationOffset, parseFromString } from '@libs/nestjs-common';
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
   * Apply criteria to a MongoDB collection and return configured cursor (alias for query)
   */
  static apply<T extends Document = Document>(collection: Collection<T>, criteria: Criteria): FindCursor<WithId<T>> {
    return this.query(collection, criteria);
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
    const filters: MongoFilterCondition[] = [];

    // Apply filters from criteria
    if (criteria.filters && criteria.filters.filters.length > 0) {
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
    }

    const orderByValue = criteria.order.orderBy.toValue();
    // Apply sorting from criteria
    if (orderByValue && criteria.order.orderType) {
      const orderTypeValue = criteria.order.orderType.toValue();
      
      // Only add sort if orderBy field is not empty and orderType is not 'none'
      if (orderByValue?.trim() !== '' && orderTypeValue !== 'none') {
        const sortOrder = orderTypeValue.toLowerCase() === 'desc' ? -1 : 1;
        options.sort = { [orderByValue]: sortOrder };
      }
    }

    // Apply pagination from criteria
    if (criteria.pagination instanceof PaginationOffset) {
      options.limit = criteria.pagination.limit;
      options.skip = criteria.pagination.offset;
    }
    
    if (criteria.pagination instanceof PaginationCursor) {
      options.limit = criteria.pagination.limit;
      if (criteria.pagination.after && criteria.pagination.tiebrakerId && orderByValue) {
        const comparator = criteria.order.orderType.toValue() === 'desc' ? '$lt' : '$gt';
        
        // Add cursor condition to the and conditions
        filters.push({
          $or: [
            { [orderByValue]: { [comparator]: parseFromString(criteria.pagination.after) } },
            { 
              [orderByValue]: parseFromString(criteria.pagination.after),
              id: { [comparator]: criteria.pagination.tiebrakerId } 
            },
          ],
        });
      }
    }
    
    return { filters, options };
  }

}