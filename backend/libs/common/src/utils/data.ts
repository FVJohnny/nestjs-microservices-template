export function parseFromString(value: string): unknown {
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

export function compareValues(a: unknown, b: unknown): number {
  // Handle null/undefined
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;

  // If both are numbers, compare numerically
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // If both are dates, compare by time
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  // If both are booleans, compare as numbers
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  // Default to string comparison
  return String(a).localeCompare(String(b));
}

export function getNestedValue(obj: object, path: string): unknown {
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
