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

  return (
    <span
      style={{
        opacity: 0.5,
        fontFamily: 'monospace',
        fontSize: 13,
        color: 'white',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
      }}
    >
      FPS {fps.toFixed(1)}
    </span>
  );
};
