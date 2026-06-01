import { useEffect, useRef } from 'react';
import { useBabylonJs } from '../BabylonJsProvider';

export function useFrameTick(callback: () => void): void {
  const { scene } = useBabylonJs();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const obs = scene.onBeforeRenderObservable.add(() => cbRef.current());
    return () => {
      scene.onBeforeRenderObservable.remove(obs);
    };
  }, [scene]);
}
