import { useState, useCallback } from 'react';

export function useLocalStorageState<T extends string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    return (stored as T) ?? defaultValue;
  });

  const set = useCallback(
    (newValue: T) => {
      window.localStorage.setItem(key, newValue);
      setValue(newValue);
    },
    [key]
  );

  return [value, set];
}
