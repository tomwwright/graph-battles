import { ActionManager } from '@babylonjs/core/Actions/actionManager';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { InspectorToken, ShowInspector } from "@babylonjs/inspector";

type BabylonJsContextValue = {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  inspectorToggle: SceneInspectorToggle
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

  const camera = new ArcRotateCamera('camera', 0, 0, 0, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());


  const inspectorToggle = new SceneInspectorToggle(scene);
  window.addEventListener("keydown", (ev) => {
    // Shift+Ctrl+Alt+I
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
      inspectorToggle.toggle();
    }
  });

  return { engine, scene, camera, inspectorToggle };
}

class SceneInspectorToggle {
  private inspectorToken?: InspectorToken;

  constructor(private readonly scene: Scene) { }

  toggle() {
    if (this.inspectorToken !== undefined) {
      console.info("Hiding BabylonJS inspector...")
      this.inspectorToken.dispose();
      this.inspectorToken = undefined;
    } else {
      console.info("Showing BabylonJS inspector...")
      this.inspectorToken = ShowInspector(this.scene);
    }
  }
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
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      />
      {context && (
        <BabylonJsContext.Provider value={context}>
          {children}
        </BabylonJsContext.Provider>
      )}
    </>
  );
}
