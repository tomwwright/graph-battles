import { useEffect, useState } from 'react';
import { useBabylonJs } from '../BabylonJsProvider';

export const FpsCounter = () => {
  const { engine } = useBabylonJs();
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(engine.getFps());
    }, 500);
    return () => clearInterval(interval);
  }, [engine]);

  return <span>FPS {fps.toFixed(1)}</span>;
};
