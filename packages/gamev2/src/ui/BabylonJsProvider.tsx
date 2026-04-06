import { ActionManager } from '@babylonjs/core/Actions/actionManager';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

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

function initialiseBabylonJs(canvas: HTMLCanvasElement): BabylonJsContextValue {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.actionManager = new ActionManager(scene);

  const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2, 2, new Vector3(0, 0.75, 0), scene);
  camera.attachControl(canvas, true);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());

  return { engine, scene, camera };
}

/**
 * Creates BabylonJS engine, scene, and camera. Renders the canvas.
 * Uses a ref to ensure only one engine is created even under StrictMode double-mount.
 */
export function BabylonJsProvider({ children }: BabylonJsProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<BabylonJsContextValue | null>(null);
  const [context, setContext] = useState<BabylonJsContextValue | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (contextRef.current == null) {
      contextRef.current = initialiseBabylonJs(canvas);
    }
    setContext(contextRef.current);

    // Don't dispose on cleanup — StrictMode remounts effects in dev
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
