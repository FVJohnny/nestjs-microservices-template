export class Data {
  static parseFromString(value: string): unknown {
    // Try to parse as number first
    const asNumber = Number(value);
    if (!isNaN(asNumber) && isFinite(asNumber)) {
      return asNumber;
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try to parse as Date
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;

    // Return as string
    return value;
  }

  static compareValues(a: unknown, b: unknown): number {
    // Handle nullish values using nullish coalescing
    const aIsNullish = a === null || a === undefined;
    const bIsNullish = b === null || b === undefined;

    if (aIsNullish && bIsNullish) return 0;
    if (aIsNullish) return -1;
    if (bIsNullish) return 1;

    // Type-specific comparisons
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }

    // Default to string comparison
    return String(a).localeCompare(String(b));
  }

  static getNestedValue(obj: object, path: string): unknown {
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
}
