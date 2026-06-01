import { Observable } from '@babylonjs/core';
import { useEffect, useRef } from 'react';

export function useBabylonObservable<T>(observable: Observable<T>, callback: (value: T) => void): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const obs = observable.add((v) => cbRef.current(v));
    return () => {
      observable.remove(obs);
    };
  }, [observable]);
}
