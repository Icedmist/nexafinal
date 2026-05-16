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
  const fallback = new Date();
  if (dateValue === null || dateValue === undefined) return fallback;

  try {
    // Firestore Timestamp
    if (dateValue && typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      try {
        const d = dateValue.toDate();
        return (d instanceof Date && !isNaN(d.getTime())) ? d : fallback;
      } catch {
        return fallback;
      }
    }

    // Object with seconds and nanoseconds (POJO after serialization)
    if (typeof dateValue === 'object' && 'seconds' in dateValue && typeof dateValue.seconds === 'number') {
      try {
        const d = new Timestamp(dateValue.seconds, dateValue.nanoseconds || 0).toDate();
        return (d instanceof Date && !isNaN(d.getTime())) ? d : fallback;
      } catch {
        const d = new Date(dateValue.seconds * 1000);
        return (d instanceof Date && !isNaN(d.getTime())) ? d : fallback;
      }
    }

    // Already a Date
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? fallback : dateValue;
    }

    // Number (milliseconds or seconds)
    if (typeof dateValue === 'number') {
      // If it looks like seconds (e.g. 1715822400), convert to millis
      const val = dateValue < 10000000000 ? dateValue * 1000 : dateValue;
      const d = new Date(val);
      return isNaN(d.getTime()) ? fallback : d;
    }

    // String (ISO or other parseable formats)
    if (typeof dateValue === 'string') {
      // Clean up string if it looks like a timestamp string
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) {
        const parsed = Date.parse(dateValue);
        if (!isNaN(parsed)) return new Date(parsed);
        return fallback;
      }
      return d;
    }
  } catch (err) {
    console.error("[ensureDate] Critical parsing error:", err, dateValue);
  }

  // Final fallback check: if somehow we got here with an invalid value
  return fallback;
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
