import { Criteria, Filter, Operator } from '@libs/nestjs-common';

/**
 * Converts DDD Criteria to MongoDB filter objects
 */
export class MongoCriteriaConverter {
  /**
   * Convert a Criteria object to MongoDB filter and options
   */
  static convert(criteria: Criteria): {
    filter: Record<string, any>;
    options: Record<string, any>;
  } {
    const filter: Record<string, any> = {};
    const options: Record<string, any> = {};

    // Apply filters from criteria
    criteria.filters.filters.forEach((filterObj: Filter) => {
      const fieldName = filterObj.field.value;
      const operator = filterObj.operator.value;
      const value = filterObj.value.value;

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

    // Apply sorting from criteria
    if (criteria.order && criteria.order.orderBy && criteria.order.orderType) {
      const orderByValue = criteria.order.orderBy.value;
      const orderTypeValue = criteria.order.orderType.value;
      
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
  private static parseValue(value: string): any {
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