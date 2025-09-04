import { type Criteria, Operator } from '@libs/nestjs-common';
import type { SelectQueryBuilder } from 'typeorm';

/**
 * Converts DDD Criteria to TypeORM QueryBuilder operations
 */
export class PostgresCriteriaConverter {
  /**
   * Convert a Criteria object to TypeORM QueryBuilder with filters, ordering, and pagination
   */
  static convert<T extends Record<string, unknown>>(
    queryBuilder: SelectQueryBuilder<T>,
    criteria: Criteria,
    entityAlias: string = 'entity'
  ): SelectQueryBuilder<T> {
    let builder = queryBuilder;

    // Apply filters from criteria
    if (criteria.filters && criteria.filters.filters) {
      criteria.filters.filters.forEach((filter, index) => {
      const paramName = `param_${index}`;
      const fieldName = `${entityAlias}.${filter.field.toValue()}`;
      const operator = filter.operator.toValue();
      const value = filter.value.toValue();

      const whereMethod = index === 0 ? 'where' : 'andWhere';

      switch (operator) {
        case Operator.EQUAL:
          builder = builder[whereMethod](`${fieldName} = :${paramName}`, {
            [paramName]: this.parseValue(value),
          });
          break;

        case Operator.NOT_EQUAL:
          builder = builder[whereMethod](`${fieldName} != :${paramName}`, {
            [paramName]: this.parseValue(value),
          });
          break;

        case Operator.GT:
          builder = builder[whereMethod](`${fieldName} > :${paramName}`, {
            [paramName]: this.parseValue(value),
          });
          break;

        case Operator.LT:
          builder = builder[whereMethod](`${fieldName} < :${paramName}`, {
            [paramName]: this.parseValue(value),
          });
          break;

        case Operator.CONTAINS:
          builder = builder[whereMethod](
            `LOWER(${fieldName}) LIKE LOWER(:${paramName})`,
            { [paramName]: `%${value}%` }
          );
          break;

        case Operator.NOT_CONTAINS:
          builder = builder[whereMethod](
            `LOWER(${fieldName}) NOT LIKE LOWER(:${paramName})`,
            { [paramName]: `%${value}%` }
          );
          break;

        default:
          // Skip unknown operators
          break;
      }
    });
    }

    // Apply ordering from criteria
    if (criteria.order && criteria.order.orderBy && criteria.order.orderType) {
      const orderByValue = criteria.order.orderBy.toValue();
      const orderTypeValue = criteria.order.orderType.toValue();
      
      // Only add sort if orderBy field is not empty and orderType is not 'none'
      if (orderByValue?.trim() !== '' && orderTypeValue !== 'none') {
        const direction = orderTypeValue.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        builder = builder.orderBy(`${entityAlias}.${orderByValue}`, direction);
      }
    }

    // Apply pagination from criteria
    if (criteria.limit) {
      builder = builder.limit(criteria.limit);
    }
    
    if (criteria.offset) {
      builder = builder.offset(criteria.offset);
    }

    return builder;
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