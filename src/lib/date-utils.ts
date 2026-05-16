import { Timestamp } from "firebase/firestore";

/**
 * Safely converts various date formats into a standard JavaScript Date object.
 * Handles:
 * - Firestore Timestamp objects
 * - ISO strings
 * - Milliseconds (numbers)
 * - Existing Date objects
 * - null/undefined (returns new Date() or a specific fallback)
 */
export function ensureDate(dateValue: any): Date {
  if (!dateValue) return new Date();

  // Firestore Timestamp
  if (dateValue instanceof Timestamp) {
    return dateValue.toDate();
  }

  // Object with seconds and nanoseconds (sometimes Firestore data is POJO after serialization)
  if (typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
    return new Timestamp(dateValue.seconds, dateValue.nanoseconds).toDate();
  }

  // Already a Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }

  // Number (milliseconds)
  if (typeof dateValue === 'number') {
    return new Date(dateValue);
  }

  // String (ISO or other parseable formats)
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  return new Date();
}

/**
 * Checks if a value is a valid date source
 */
export function isValidDate(dateValue: any): boolean {
  if (!dateValue) return false;
  try {
    const d = ensureDate(dateValue);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}
