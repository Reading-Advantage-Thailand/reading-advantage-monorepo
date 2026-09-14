import { useEffect, useState } from "react";

/**
 * Debounces a value by the given delay.
 * @param value Raw value that changes often.
 * @param delay Milliseconds to wait after the last change.
 * @returns The settled value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
