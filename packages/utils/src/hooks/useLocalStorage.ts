import { useState, useEffect, useCallback, useRef } from "react";

/**
 * A React hook for managing localStorage with SSR support and cross-tab synchronization.
 * @param key - The localStorage key to store the value under
 * @param initialValue - The initial value to use when no stored value exists
 * @returns A tuple of [storedValue, setValue, removeValue] for state management
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  const storedValueRef = useRef(storedValue);
  storedValueRef.current = storedValue;

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
        storedValueRef.current = valueToStore;
        setStoredValue(valueToStore);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      storedValueRef.current = initialValue;
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.storageArea !== null && e.storageArea !== window.localStorage) return;
      if (e.key !== key && e.key !== null) return;
      if (e.newValue === null) {
        storedValueRef.current = initialValue;
        setStoredValue(initialValue);
        return;
      }
      try {
        const nextValue = JSON.parse(e.newValue) as T;
        storedValueRef.current = nextValue;
        setStoredValue(nextValue);
      } catch {
        // ignore parse errors from other tabs
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [initialValue, key]);

  return [storedValue, setValue, removeValue] as const;
}
