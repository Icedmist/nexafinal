/**
 * Recursively cleans an object or array to remove any `undefined` properties.
 * Firestore `writeBatch`, `setDoc`, and `updateDoc` throw an exception if any field has an `undefined` value.
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as unknown as T;
  }

  if (typeof data === "object" && !(data instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }

  return data;
}
