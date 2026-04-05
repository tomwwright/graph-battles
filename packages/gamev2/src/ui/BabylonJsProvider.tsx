import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

type BabylonJsContextValue = {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
};

const BabylonJsContext = createContext<BabylonJsContextValue | null>(null);

export function useBabylonJs(): BabylonJsContextValue {
  const ctx = useContext(BabylonJsContext);
  if (!ctx) {
    throw new Error('useBabylonJs must be used within a BabylonJsProvider');
  }
  return ctx;
}

type BabylonJsProviderProps = {
  children: ReactNode;
};

/**
 * Creates BabylonJS engine, scene, and camera. Renders the canvas.
 * Children receive the BabylonJS context via useBabylonJs().
 */
export function BabylonJsProvider({ children }: BabylonJsProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<BabylonJsContextValue | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      20,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    setContext({ engine, scene, camera });

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {context && (
        <BabylonJsContext.Provider value={context}>
          {children}
        </BabylonJsContext.Provider>
      )}
    </>
  );
}
