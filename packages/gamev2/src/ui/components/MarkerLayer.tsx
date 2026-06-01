import { createContext, useContext, useMemo, useRef } from 'react';
import { Matrix, Vector3 } from '@babylonjs/core';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { useGameStore } from '../../state/useGameStore';
import { useGameRenderer, useGameOrchestrator } from '../GameOrchestratorProvider';
import { useBabylonJs } from '../BabylonJsProvider';
import { useFrameTick } from '../hooks/useFrameTick';
import { TerritoryMarker } from './TerritoryMarker';
import { UnitMarker } from './UnitMarker';
import type { RefObject } from 'react';

export type MarkerEntry = {
  ref: RefObject<HTMLDivElement | null>;
  /** Returns the entity's center in world space. The frame tick applies the camera-relative offset. */
  getCenterWorldPos: () => Vector3 | null;
  /** World-unit radius of the entity — controls how far the marker sits from center. */
  offsetAmount: number;
};

type MarkerRegistry = {
  register: (id: string, entry: MarkerEntry) => void;
  unregister: (id: string) => void;
};

const MarkerRegistryContext = createContext<MarkerRegistry | null>(null);

export function useMarkerRegistry(): MarkerRegistry {
  const ctx = useContext(MarkerRegistryContext);
  if (!ctx) throw new Error('useMarkerRegistry must be used within MarkerLayer');
  return ctx;
}

const TERRITORY_OFFSET_AMOUNT = 1.35;
const UNIT_OFFSET_AMOUNT = 0.6;

export function MarkerLayer() {
  const { scene, engine, camera } = useBabylonJs();
  const renderer = useGameRenderer();
  const { store } = useGameOrchestrator();

  // Selectors return strings (primitives) so Object.is gives stable comparison.
  // Getters like map.territoryIds return new array instances on every call —
  // returning the array directly would cause useSyncExternalStore to see a
  // perpetual change and trigger an infinite re-render loop.
  const territoryIdsKey = useGameStore((s) => s.map?.territoryIds.join(',') ?? '');
  const unitIdsKey = useGameStore((s) => s.map?.unitIds.join(',') ?? '');
  const territoryIds = useMemo(() => (territoryIdsKey ? territoryIdsKey.split(',') : []), [territoryIdsKey]);
  const unitIds = useMemo(() => (unitIdsKey ? unitIdsKey.split(',') : []), [unitIdsKey]);

  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const registryVersionRef = useRef(0);

  const lastRef = useRef({
    camX: NaN, camZ: NaN, camR: NaN, camA: NaN, camB: NaN,
    vpW: NaN, vpH: NaN,
    mapRevision: -1,
    registryVersion: -1,
  });

  // Stable registry object — backed by refs so the context value never changes.
  const registryRef = useRef<MarkerRegistry>({
    register(id, entry) {
      markersRef.current.set(id, entry);
      registryVersionRef.current++;
    },
    unregister(id) {
      markersRef.current.delete(id);
      registryVersionRef.current++;
    },
  });

  const arcCamera = camera as ArcRotateCamera;

  useFrameTick(() => {
    const state = store.getState();
    const vpW = engine.getRenderWidth();
    const vpH = engine.getRenderHeight();
    const mapRevision = state.mapRevision;
    const registryVersion = registryVersionRef.current;
    const last = lastRef.current;

    const dirty =
      state.pendingAnimations.length > 0 ||
      mapRevision !== last.mapRevision ||
      registryVersion !== last.registryVersion ||
      arcCamera.target.x !== last.camX ||
      arcCamera.target.z !== last.camZ ||
      arcCamera.radius !== last.camR ||
      arcCamera.alpha !== last.camA ||
      arcCamera.beta !== last.camB ||
      vpW !== last.vpW ||
      vpH !== last.vpH;

    if (!dirty) return;

    last.camX = arcCamera.target.x;
    last.camZ = arcCamera.target.z;
    last.camR = arcCamera.radius;
    last.camA = arcCamera.alpha;
    last.camB = arcCamera.beta;
    last.vpW = vpW;
    last.vpH = vpH;
    last.mapRevision = mapRevision;
    last.registryVersion = registryVersion;

    // Camera-relative right and down unit vectors in world XZ space.
    // At alpha=0 the working offset is (+X, +Z). As alpha changes we rotate
    // that base by alpha using the standard XZ rotation matrix columns:
    //   right = R(alpha) * (1,0) = (cos α,  0, sin α)
    //   down  = R(alpha) * (0,1) = (-sin α, 0, cos α)
    // So offset at any alpha = right + down = (cos α − sin α, 0, sin α + cos α),
    // which correctly equals (1,0,1) at α=0 and rotates with the camera.
    const alpha = arcCamera.alpha;
    const camRight = new Vector3( Math.cos(alpha), 0, Math.sin(alpha));
    const camDown  = new Vector3(-Math.sin(alpha), 0, Math.cos(alpha));

    const xform = scene.getTransformMatrix();
    const vp = arcCamera.viewport.toGlobal(vpW, vpH);
    const identity = Matrix.Identity();

    for (const [, entry] of markersRef.current) {
      const el = entry.ref.current;
      if (!el) continue;

      const center = entry.getCenterWorldPos();
      if (!center) {
        el.style.visibility = 'hidden';
        continue;
      }

      const worldPos = center.add(
        camRight.scale(entry.offsetAmount).add(camDown.scale(entry.offsetAmount))
      );

      const proj = Vector3.Project(worldPos, identity, xform, vp);

      if (proj.z < 0 || proj.z > 1) {
        el.style.visibility = 'hidden';
        continue;
      }

      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;
    }
  });

  return (
    <MarkerRegistryContext.Provider value={registryRef.current}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        {territoryIds.map((id) => (
          <TerritoryMarker key={id} id={id} offsetAmount={TERRITORY_OFFSET_AMOUNT} renderer={renderer} />
        ))}
        {unitIds.map((id) => (
          <UnitMarker key={id} id={id} offsetAmount={UNIT_OFFSET_AMOUNT} renderer={renderer} />
        ))}
      </div>
    </MarkerRegistryContext.Provider>
  );
}
