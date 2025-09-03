import { type Criteria, type Filter, Operator } from '@libs/nestjs-common';

/**
 * MongoDB query options interface
 */
interface MongoQueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

/**
 * MongoDB criteria conversion result
 */
interface MongoCriteriaResult {
  filter: Record<string, unknown>;
  options: MongoQueryOptions;
}

/**
 * Converts DDD Criteria to MongoDB filter objects
 */
export class MongoCriteriaConverter {
  /**
   * Convert a Criteria object to MongoDB filter and options
   */
  static convert(criteria: Criteria): MongoCriteriaResult {
    const filter: Record<string, unknown> = {};
    const options: MongoQueryOptions = {};

    // Apply filters from criteria
    if (criteria.filters && criteria.filters.filters) {
      criteria.filters.filters.forEach((filterObj: Filter) => {
      const fieldName = filterObj.field.toValue();
      const operator = filterObj.operator.toValue();
      const value = filterObj.value.toValue();

      switch (operator) {
        case Operator.EQUAL:
          filter[fieldName] = this.parseValue(value);
          break;
        case Operator.NOT_EQUAL:
          filter[fieldName] = { $ne: value };
          break;
        case Operator.CONTAINS:
          filter[fieldName] = { $regex: value, $options: 'i' };
          break;
        case Operator.NOT_CONTAINS:
          filter[fieldName] = { $not: { $regex: value, $options: 'i' } };
          break;
        case Operator.GT:
          filter[fieldName] = { $gt: this.parseValue(value) };
          break;
        case Operator.LT:
          filter[fieldName] = { $lt: this.parseValue(value) };
          break;
      }
    });
    }

    // Apply sorting from criteria
    if (criteria.order && criteria.order.orderBy && criteria.order.orderType) {
      const orderByValue = criteria.order.orderBy.toValue();
      const orderTypeValue = criteria.order.orderType.toValue();
      
      // Only add sort if orderBy field is not empty and orderType is not 'none'
      if (orderByValue?.trim() !== '' && orderTypeValue !== 'none') {
        const sortOrder = orderTypeValue.toLowerCase() === 'desc' ? -1 : 1;
        options.sort = { [orderByValue]: sortOrder };
      }
    }

    // Apply pagination from criteria
    if (criteria.limit) {
      options.limit = criteria.limit;
    }
    
    if (criteria.offset) {
      options.skip = criteria.offset;
    }

    return { filter, options };
  }

  /**
   * Parse value based on its type - handles dates, numbers, booleans
   */
  private static parseValue(value: string): string | number | boolean | Date {
    // Try to parse as Date if it looks like an ISO string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try to parse as number
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value);
    }

    // Try to parse as boolean
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }

    // Return as-is
    return value;
  }

}