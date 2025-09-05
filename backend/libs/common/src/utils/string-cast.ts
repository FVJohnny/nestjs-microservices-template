export function parseFromString(value: string): string | number | boolean | Date {
    if (typeof value !== 'string') {
      return value;
    }
    
    // Try to parse as Date if it looks like an ISO string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Return as-is
    return value;
  }