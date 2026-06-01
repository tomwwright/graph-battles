# React UI Markers

## Goal

Render screen-space status markers anchored to every territory and every unit in the gamev2 client. Markers display at-a-glance information (owner color, planned action, unit statuses) so players can read board state without selecting entities.

This work also formalises a small set of React↔Babylon integration utilities so the per-frame DOM updates required by markers (and any future per-frame UI) follow a consistent, StrictMode-safe pattern.

## Scope

In scope:

- `MarkerLayer` React component with one marker per territory and one per unit.
- Per-frame world→screen projection driving each marker's CSS `transform`, decoupled from React state.
- Idle optimisation: skip projection entirely when neither camera nor any tracked animation has moved since the last tick.
- Content rendering (color chip, ASCII status symbols) driven by store subscriptions.
- Visibility filter honouring `visibilityMode === 'current-player'`.
- Reusable `useFrameTick` / `useBabylonObservable` hooks for Babylon observable subscriptions.
- Renderer accessors needed to read entity world positions / meshes.
- Short documentation update in `packages/gamev2/AGENTS.md` recording the integration pattern.

Out of scope:

- Retrofitting the existing cursor tooltip (different anchoring problem; single component; no performance pressure).
- Heavier refactor of `BabylonJsProvider` / `GameOrchestratorProvider` (current ref-singleton pattern remains correct for heavyweight resources).
- Animations on markers themselves (color fades, scale punches, etc.). Defer.
- Marker pointer interactivity (clicking a marker to select). Defer; markers are `pointer-events: none`.

## Visual design

Each marker is a rounded "pill" styled similarly to the existing tooltip:

```
┌─────────────────┐
│ [chip]  M  D    │
└─────────────────┘
```

Left to right inside the pill:

1. **Control marker** — a small filled shape (square or circle) in the player's color. Shape varies by player so the encoding is not color-only (accessibility). Neutral / unowned territories render a grey hollow chip.
2. **Status symbols** — zero or more single-character ASCII glyphs.

Marker anchoring: positioned so the top-left corner of the pill aligns with the bottom-right corner of the entity's projected world anchor (see Positioning).

Styling cues from existing `Tooltip`:

- `padding: 4px 8px`
- `borderRadius: 12px` (pill)
- `fontFamily: monospace`
- `fontSize: 12`
- `color: white`
- `backgroundColor: rgba(0, 0, 0, 0.6)`
- `textShadow: 1px 1px 2px rgba(0,0,0,0.8)`
- `pointerEvents: none`
- `zIndex: 10` (below the cursor tooltip at `zIndex: 20`)
- `whiteSpace: nowrap`

### Content rules

**Unit marker**

| Condition | Symbol |
|---|---|
| `unit.data.destinationId != null` | `M` |
| Status `DEFEND` present | `D` |
| Status `STARVE` present | `S` |

Symbols stack horizontally in the listed order. Color chip uses the unit's owning player's color.

**Territory marker**

| Condition | Symbol |
|---|---|
| Player has a planned territory action on this territory | `A` |

Color chip uses `territory.playerId`'s color, or neutral grey when `null`.

### Player shapes

Map `Values.Colour` (or player index) to a fixed shape so the encoding survives color-blindness:

| Player index | Shape |
|---|---|
| 0 | filled circle |
| 1 | filled square |
| 2 | filled triangle |
| 3 | filled diamond |

Implementation: render the chip as an inline SVG or unicode glyph (`●`, `■`, `▲`, `◆`) styled via `color` to match the player's color. Final choice deferred to first implementation pass; either is workable.

## Visibility rules

| Marker type | When shown |
|---|---|
| Territory marker | Always shown. Player ownership is not fog-of-war'd. |
| Territory `A` symbol | Only when `isLocationVisible(currentPlayer, territoryId)`. |
| Unit marker | Only when `isUnitVisible(currentPlayer, unitId)`. |

When `visibilityMode === 'all'` (hot-seat), all markers and symbols are unconditionally shown.

The "current player" used for visibility tests is `selectResolvedCurrentPlayerId(state)`.

## Positioning

### Bottom-right anchor with zoom-aware offset

Each marker is anchored at the projected screen position of a world-space offset point relative to the entity:

```
anchorWorld = entityCenterWorld + offsetVector
```

Where `offsetVector` is roughly the entity's right-front corner in world units:

- Territory: `(+1.5, 0, +1.5)` (hex radius scale)
- Unit: `(+0.6, 0, +0.6)` (unit half-width scale)

`Vector3.Project` is applied to `anchorWorld`. The resulting `(x, y)` is set as `transform: translate3d(x, y, 0)` on the marker element's top-left corner.

Why this scales naturally with zoom: when the camera zooms in, the world-space offset projects to a larger screen distance, so the marker drifts further from the entity center. Zoomed out, the offset projects small and the marker hugs the entity. No manual zoom factor or DPI scaling needed beyond honouring `engine.getHardwareScalingLevel()` when going from canvas pixels to CSS pixels.

### Position sources

| Marker type | World position function |
|---|---|
| Territory | `grid.getWorldPosition(hexCenterTile(coord))` — static; precomputed and cached. |
| Unit | `mesh.getAbsolutePosition()` — read each frame so Babylon's animation system (move lerps, arrange tweens) drives marker motion automatically. |

### Off-screen culling

For each marker per frame, after projection:

- If `proj.z < 0` or `proj.z > 1`: marker is behind the camera or beyond the far plane. Set `style.visibility = 'hidden'`.
- Otherwise: set `style.visibility = 'visible'` and write the transform.

`visibility: hidden` keeps layout costs lower than re-mounting on the fence between frames. Optionally widen to `display: none` if profiling shows paint cost dominating.

### HiDPI / hardware scaling

`Vector3.Project` returns coordinates in render-target pixels. The canvas CSS size may differ from the render target by `engine.getHardwareScalingLevel()`. Convert to CSS pixels by dividing the projected `x` and `y` by `hardwareScalingLevel * devicePixelRatio` (exact math to be verified against actual canvas layout during implementation).

## Render-vs-React split

Each marker has two independent update channels into the same DOM node:

| Concern | Owner | Update trigger | Mechanism |
|---|---|---|---|
| Position (`style.transform`) | Babylon frame loop | `onBeforeRenderObservable` (60 fps) | Direct DOM write via `ref` |
| Visibility cull (`style.visibility`) | Babylon frame loop | `onBeforeRenderObservable` (60 fps) | Direct DOM write via `ref` |
| Existence (mount/unmount) | React | Territory/unit list change | Keyed list in `MarkerLayer` |
| Color chip | React | Owner change | `useGameStore` selector |
| Shape | React | Owner change | `useGameStore` selector |
| Status symbols (`M`/`D`/`S`/`A`) | React | Status / action / destination change | `useGameStore` selectors per flag |
| Visibility filter (fog of war) | React | Visibility change | Selector returning `null` causes marker to render nothing |

The two channels touch different DOM properties (`transform`/`visibility` vs subtree content) so they do not contend. Babylon writes inline styles directly; React owns the React tree.

## Performance analysis

### Baseline

Realistic upper bound: ~30 territories, ~30 units → ~60 markers.

### Per-frame projection

- `Vector3.Project`: a few hundred ns per call on modern hardware.
- 60 markers × 60 fps = 3,600 projections/s ≈ **~30 μs/frame**.
- Style writes (compositor-only `transform`): 60 × ~1 μs = **~60 μs/frame**.
- Total **~100 μs/frame**, or ~0.6% of a 16.6 ms budget. Headroom to 200+ markers before this dominates.

### React reconcile

The risk is in React, not projection. Mitigations:

- Position **never** stored in React state. No `setState` per frame.
- Content selectors return primitives (`playerId`, `boolean` flags). `useSyncExternalStore` uses `Object.is` to skip re-renders when primitives don't change.
- Each dispatch re-evaluates every marker's selector (cheap), but only markers whose underlying primitive actually changed re-render.
- Re-rendered tree is small (one `<div>`, one chip, up to 3 `<span>`s). Reconcile cost is negligible.

### Subscription model

```ts
useGameStore(s => s.map.unit(id)?.data.destinationId != null);     // boolean
useGameStore(s => s.map.unit(id)?.data.statuses.includes(DEFEND)); // boolean
useGameStore(s => s.map.unit(id)?.data.statuses.includes(STARVE)); // boolean
useGameStore(s => s.map.unit(id)?.data.playerId ?? null);          // ID | null
useGameStore(s => isUnitVisible(s.map, currentPlayer, id));        // boolean
```

Selectors must not allocate new arrays / objects — return primitives only.

### Idle optimisation

Skip the entire projection loop when the scene is visually static — there is nothing to reproject. The marker layer maintains a small bit of cached state between frames and bails out early when nothing has changed.

**Dirty signal sources**

| Source | What we read | When it changes |
|---|---|---|
| Camera | `camera.target.x`, `camera.target.z`, `camera.radius`, `camera.alpha`, `camera.beta` | User pan/zoom/rotate, programmatic `focusOn` animation, zoom cycle animation |
| Engine viewport | `engine.getRenderWidth()`, `engine.getRenderHeight()` | Window resize |
| Animation tracker | `store.getState().pendingAnimations.length > 0` | Unit move lerps, arrange tweens, camera focus, composition deltas |
| Marker registry version | `registryVersion` counter bumped on `register` / `unregister` | Marker added or removed (mount/unmount) |

**Algorithm per frame**

```ts
const cam = { x: camera.target.x, z: camera.target.z, r: camera.radius, a: camera.alpha, b: camera.beta };
const vp  = { w: engine.getRenderWidth(), h: engine.getRenderHeight() };
const hasAnims = store.getState().pendingAnimations.length > 0;

const dirty =
  hasAnims ||
  registryVersion !== lastRegistryVersion ||
  cam.x !== last.cam.x || cam.z !== last.cam.z ||
  cam.r !== last.cam.r || cam.a !== last.cam.a || cam.b !== last.cam.b ||
  vp.w !== last.vp.w || vp.h !== last.vp.h;

if (!dirty) return;

// project all markers, write transforms, update cull state
projectAll();

last.cam = cam;
last.vp = vp;
lastRegistryVersion = registryVersion;
```

**Why this is sufficient**

- Camera fields cover every way the projection matrix changes (pan, zoom, rotate). `ArcRotateCamera` derives its view matrix from these scalars.
- `pendingAnimations.length > 0` forces continued projection while any unit/camera/composition animation is in flight, even if the camera itself is momentarily stationary mid-animation (the *unit* anchor world position is changing).
- Marker registry version handles mount/unmount races where a new marker registers between frames and needs a first paint.
- Viewport size covers `window resize` (canvas dimensions change → projection viewport changes).

**First-frame and force-dirty**

- Initialise `last.*` to sentinel values (`NaN` or `-1`) so the first frame is always considered dirty.
- Expose `MarkerLayer.invalidate()` as an escape hatch on the registry context. Markers can call it when their content changes in a way that affects positioning (currently none — content swaps don't move the pill, so probably unused in practice). Reserved for future use.

**Subscribing to `pendingAnimations`**

`MarkerLayer` doesn't need a React subscription to `pendingAnimations` — the frame tick reads it directly from `store.getState()`. The store is a stable reference; no React re-renders involved. Read happens once per tick (cheap object access), not per marker.

**Cost when idle**

- 5 scalar reads from `camera`, 2 from `engine`, 1 from `store`.
- 7 numeric comparisons + 1 length check.
- Total well under 1 μs/frame. Effectively zero CPU while the board is static.

**Cost when active**

Same as the non-optimised case (~100 μs/frame for 60 markers).

**Correctness guarantees**

- Unit `setUnitPosition` (snap, non-animated) is always wrapped by `arrangeLocation` which mutates `mesh.position` directly. This happens during dispatched state changes — `pendingAnimations` won't be set. To cover this case, **also dirty on `mapRevision` change**: subscribe to the store with a narrow selector that bumps a counter, fold into the dirty check. This catches any imperative mesh mutation triggered by `map/mutated`.

Updated dirty check:

```ts
const dirty =
  hasAnims ||
  mapRevision !== last.mapRevision ||
  registryVersion !== lastRegistryVersion ||
  /* camera + viewport diffs */;
```

`mapRevision` already bumps once per `map/mutated`; a snap-arrange immediately after is covered because the bump happens before the frame fires.

**Validation**

- With dev tools open and `console.log` in the projection loop, confirm logs cease ~1 frame after panning stops.
- Confirm logs resume the frame a unit move begins (camera idle + animation in flight).
- Confirm logs fire on `map/mutated` even when no animation is pending (composition snap case).

**Defer (still future)**

- Per-marker dirty tracking (only reproject markers whose anchor or visibility actually changed). Not justified at current scale; gates only ~100 μs of total work.

### Validation

- Run `yarn workspace @battles/gamev2 dev` with a populated game (multiple players, ≥20 units).
- Watch `FpsCounter` during steady-state, replay (rapid `map/mutated` + animations), and camera focus animations.
- Chrome DevTools Performance profile: confirm no React reconcile spikes during steady state; confirm per-frame budget under ~1 ms for marker work.

## React↔Babylon integration utilities

### Current touchpoints

| Touchpoint | Direction | Dedupe mechanism |
|---|---|---|
| `BabylonJsProvider` engine/scene/camera creation | Heavyweight resource | `contextRef` singleton; no dispose on cleanup |
| `GameOrchestratorProvider` init | One-shot async | `initPromiseRef` shared across StrictMode mounts |
| Renderer hover/click callbacks | Babylon → React | Set once on init |
| `HandlerContext.dispatch / applyAction` | React → Babylon (via orchestrator) | Already centralised |
| `CameraSyncer` focus | React (store) → Babylon (async) | `trackAnimation` tokens |
| Animation lifecycle | Babylon → store | `trackAnimation` tokens |
| Marker projection (new) | Babylon → DOM per frame | Needs a hook (see below) |

### Pattern

There are two distinct kinds of integration:

- **Heavyweight resource creation** (engine, orchestrator, renderer): needs a ref-singleton pattern in the relevant provider so StrictMode's double-mount doesn't double-construct. Already in place. Leave alone.
- **Lightweight observer subscriptions** (frame ticks, scene events, mesh events): cheap to add/remove; the pair-with-cleanup React effect idiom works perfectly under StrictMode. Currently reinvented per usage. Formalise.

### New hooks

Add `packages/gamev2/src/ui/hooks/useFrameTick.ts`:

```ts
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
```

Add `packages/gamev2/src/ui/hooks/useBabylonObservable.ts`:

```ts
import { Observable } from '@babylonjs/core';
import { useEffect, useRef } from 'react';

export function useBabylonObservable<T>(
  observable: Observable<T>,
  callback: (value: T) => void
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    const obs = observable.add((v) => cbRef.current(v));
    return () => {
      observable.remove(obs);
    };
  }, [observable]);
}
```

Both hooks are StrictMode-safe by construction: each mount adds its own observer and removes only that observer on cleanup.

### What does *not* change

- `BabylonJsProvider`'s ref-singleton: correct for engine creation cost.
- `GameOrchestratorProvider`'s `initPromiseRef`: correct for one-shot async init.
- `HandlerContext` for React→Babylon imperative writes: already centralised.
- Renderer callback registration (`onTerritoryClick`, etc.): fine as one-shot wiring.

### Documentation

Add a short "React↔Babylon integration" section to `packages/gamev2/AGENTS.md` recording:

- Heavyweight resources → ref-singleton inside provider.
- Lightweight observer subs → `useFrameTick` / `useBabylonObservable`.
- React → Babylon game-logic writes → through `HandlerContext`.
- Babylon → DOM per-frame writes (markers) → direct ref writes inside `useFrameTick`, never React state.

## Renderer accessors

`GameRenderer` needs to expose two read-only lookups for the marker layer:

```ts
class GameRenderer {
  getTerritoryWorldPos(id: ID): Vector3 | null;  // territory center in world space
  getUnitMesh(id: ID): AbstractMesh | null;       // for getAbsolutePosition() each frame
}
```

Implementation:

- `getTerritoryWorldPos`: existing logic already lives in private `unitRenderer.territoryCenterPosition`. Lift up to the facade or duplicate as needed.
- `getUnitMesh`: expose via `unitRenderer.getMesh(id)` returning `this.units.get(id)?.mesh ?? null`. Currently `units` is private; add a narrow getter.

## Component decomposition

### New files

| File | Responsibility |
|---|---|
| `src/ui/hooks/useFrameTick.ts` | Subscribe a callback to `scene.onBeforeRenderObservable`. |
| `src/ui/hooks/useBabylonObservable.ts` | Generic Babylon `Observable` subscription. |
| `src/ui/components/MarkerLayer.tsx` | Top-level marker overlay; iterates ids; runs projection loop. |
| `src/ui/components/MarkerLayer.module.css` | Pill, chip, symbol styles. |
| `src/ui/components/TerritoryMarker.tsx` | Per-territory marker content + position registration. |
| `src/ui/components/UnitMarker.tsx` | Per-unit marker content + position registration. |

### MarkerLayer responsibilities

- Render absolute-positioned overlay div above the canvas, below the cursor tooltip.
- Iterate `selectAllTerritoryIds(state)` and (visibility-filtered) `selectAllUnitIds(state)`.
- Provide a context (`MarkerRegistryContext`) exposing `register(id, ref, worldPosFn)` / `unregister(id)`.
- Inside `useFrameTick`: iterate registered markers, project, write `transform` and `visibility`.

### TerritoryMarker

```tsx
function TerritoryMarker({ id }: { id: ID }) {
  const ref = useRef<HTMLDivElement>(null);
  const playerId = useGameStore(s => s.map.territory(id)?.playerId ?? null);
  const hasAction = useGameStore(s => isLocationVisible(s.map, currentPlayer, id) && hasPlannedAction(s.map, id));

  useMarkerRegistration(id, ref, () => getTerritoryAnchorWorld(id));

  return (
    <div ref={ref} className={styles.pill}>
      <PlayerChip playerId={playerId} />
      {hasAction && <span>A</span>}
    </div>
  );
}
```

### UnitMarker

```tsx
function UnitMarker({ id }: { id: ID }) {
  const ref = useRef<HTMLDivElement>(null);
  const playerId  = useGameStore(s => s.map.unit(id)?.data.playerId ?? null);
  const visible   = useGameStore(s => isUnitVisible(s.map, currentPlayer, id));
  const moving    = useGameStore(s => s.map.unit(id)?.data.destinationId != null);
  const defending = useGameStore(s => s.map.unit(id)?.data.statuses.includes(Values.Status.DEFEND) ?? false);
  const starving  = useGameStore(s => s.map.unit(id)?.data.statuses.includes(Values.Status.STARVE) ?? false);

  useMarkerRegistration(id, ref, () => getUnitAnchorWorld(id));

  if (!visible) return null;

  return (
    <div ref={ref} className={styles.pill}>
      <PlayerChip playerId={playerId} />
      {moving && <span>M</span>}
      {defending && <span>D</span>}
      {starving && <span>S</span>}
    </div>
  );
}
```

`PlayerChip` looks up player color + shape from `playerId` and renders the chip.

## Implementation order

1. Add `useFrameTick.ts` and `useBabylonObservable.ts` hooks.
2. Add renderer accessors (`getTerritoryWorldPos`, `getUnitMesh`).
3. Build `MarkerLayer` skeleton with placeholder square markers — verify projection, zoom-tracking, off-screen culling.
4. Add `PlayerChip`, `TerritoryMarker`, `UnitMarker` with content selectors.
5. Wire visibility filter into `UnitMarker` and territory `A` symbol.
6. Slot `<MarkerLayer />` into `App.tsx` alongside `<Tooltip />`.
7. Add idle optimisation: cached camera/viewport/registry/mapRevision state + early-out in the frame tick.
8. Manual test in `yarn workspace @battles/gamev2 dev`:
   - Hot-seat (visibility = `all`) with multiple players + units.
   - API/local with `userId` set (fog of war).
   - Replay scrubbing + camera animations + unit move animations.
   - Idle: pan camera, stop, confirm projection loop bails out (log probe).
9. Profile with Chrome DevTools Performance; verify no reconcile regression and zero work when idle.
10. Update `packages/gamev2/AGENTS.md` with the integration pattern section.

## Risks / open questions

- **HiDPI scaling math** — exact conversion between `Vector3.Project` output and CSS pixels needs verification against real canvas layout. Likely a `1 / engine.getHardwareScalingLevel()` factor; confirm during impl.
- **`hasPlannedAction` lookup** — depends on how planned territory actions are stored in the model (`territory.data.action`? a player-level map?). Resolve during impl by reading the relevant model code.
- **Player color source** — `map.player(territory.playerId).data.colour` likely. Verify and centralise into a `colorFor(playerId)` helper.
- **Marker overlap** — when many units share a territory, their markers may stack on the same screen point. The world-space offset puts them at the same anchor. Acceptable for v1; future enhancement could cascade markers vertically per stack.
- **Unit grid arrangement during animations** — `UnitSyncer` arranges multiple units per location. Reading `mesh.getAbsolutePosition()` each frame already follows arrangement; no extra work needed.
- **Babylon `Observable.remove` semantics** — confirm it accepts an `Observer` and that removing the wrong-mount observer is safe under StrictMode. The hook design only ever removes its own observer, so this should be fine.
