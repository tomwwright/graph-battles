import { useEffect, useRef, type RefObject } from 'react';
import { Vector3 } from '@babylonjs/core';
import { useMarkerRegistry } from '../components/MarkerLayer';

export function useMarkerRegistration(
  id: string,
  ref: RefObject<HTMLDivElement | null>,
  getCenterWorldPos: () => Vector3 | null,
  offsetAmount: number,
): void {
  const registry = useMarkerRegistry();
  const getCenterRef = useRef(getCenterWorldPos);
  getCenterRef.current = getCenterWorldPos;

  useEffect(() => {
    registry.register(id, { ref, getCenterWorldPos: () => getCenterRef.current(), offsetAmount });
    return () => registry.unregister(id);
  }, [id, registry, offsetAmount]);
}
