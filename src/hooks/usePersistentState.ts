import { useState, useEffect, useRef, useCallback } from "react";

function readStored<T>(key: string, deserialize: (raw: string) => T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return deserialize(raw);
  } catch {
    return null;
  }
}

/**
 * useState persisted to localStorage so mid-work state survives a page
 * refresh. Writes are debounced (default 300ms) to avoid thrashing on
 * rapid updates like cart quantity changes.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (raw: string) => T;
    debounceMs?: number;
  }
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? (JSON.parse as (raw: string) => T);
  const debounceMs = options?.debounceMs ?? 300;

  const [value, setValue] = useState<T>(() => {
    const stored = readStored(key, deserialize);
    return stored !== null ? stored : initialValue;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, serialize(value));
      } catch {
        // Storage full / unavailable — keep in-memory state.
      }
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, debounceMs, serialize]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return [value, setValue, clear];
}

/** Serialize helpers for Map<string, number> (cart / custom prices). */
export const mapEntriesSerializer = {
  serialize: (m: Map<string, number>) => JSON.stringify(Array.from(m.entries())),
  deserialize: (raw: string) => new Map<string, number>(JSON.parse(raw) as [string, number][]),
};
