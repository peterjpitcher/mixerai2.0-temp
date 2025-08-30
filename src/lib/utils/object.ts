/**
 * Strips undefined and null values from an object, but preserves false values
 * This is important for boolean fields that need to maintain their false state
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as T;
}

/**
 * Ensures boolean fields have explicit values (false instead of undefined)
 */
export function ensureBooleanDefaults<T extends Record<string, any>>(
  obj: T,
  booleanFields: string[]
): T {
  const result = { ...obj } as any;
  for (const field of booleanFields) {
    if (result[field] === undefined || result[field] === null) {
      result[field] = false;
    }
  }
  return result as T;
}