# gamev2 Mobile UI Refactor

## Goal

Refactor `packages/gamev2` UI for mobile-first layout. Switch touch input bindings. Keep desktop landscape sensible via single responsive tree.

## Layout

### Slots

- **Header bar** (top, dark, `pointer-events: auto`, left-aligned): turn selector + phase status.
- **Left column** (transparent overlay, `pointer-events: none` with panel opt-in, left-aligned): player leaderboard / stats.
- **Right column** (transparent overlay, right-aligned):
  - top: game info panel (max turns, victory point limit).
  - bottom (above footer): selected unit/territory info + actions, or replay detail.
- **Footer bar** (bottom, dark, `pointer-events: auto`, right-aligned): Ready / Cancel / Resolve Next / Auto.

### Strategy

Single responsive DOM tree (one render path). Mobile-first CSS grid. Desktop widens columns via `@media`.

```css
.frame {
  position: absolute; inset: 0;
  display: grid;
  grid-template-rows: 50px 1fr 50px;
  grid-template-columns: 1fr 1fr;
  pointer-events: none;
}
.header  { grid-row: 1; grid-column: 1 / -1; justify-content: flex-start; }
.leftCol { grid-row: 2; grid-column: 1; align-items: flex-start; }
.rightCol{ grid-row: 2; grid-column: 2; align-items: flex-end; }
.footer  { grid-row: 3; grid-column: 1 / -1; justify-content: flex-end; }
.col     { display: flex; flex-direction: column; gap: 8px; padding: 8px; pointer-events: none; }

@media (min-width: 900px) {
  .leftCol, .rightCol { width: 260px; }
  .leftCol  { justify-self: start; }
  .rightCol { justify-self: end; }
}
```

Right column bottom slot uses `margin-top: auto` to pin selected info above footer.

## Component decomposition

### New components

| File | Source | Responsibility |
|---|---|---|
| `TurnSelector.tsx` | lifted from `GameInfoPanel` | turn buttons + phase badge. Horizontal scroll on overflow (`overflow-x: auto; flex-wrap: nowrap`). |
| `PlayerLeaderboard.tsx` | lifted from `GameInfoPanel` | players list with active highlight. Wraps `panels.module.css` panel. |
| `GameSettingsPanel.tsx` | new | reads `game.data.maxTurns`, `game.data.victoryPointsLimit` (verify field names in `@battles/models`). |
| `ActionBar.tsx` | new | branches on `turnPhase`: planning → Ready + Cancel; replaying → Resolve Next + Auto checkbox; next-player/victory → empty (modals handle). |

### Modified

- `Frame.tsx` — replace `Sidebar` exports with `LeftColumn` / `RightColumn`.
- `Frame.module.css` — grid rewrite per above.
- `App.tsx` — new tree:

```tsx
<Frame>
  <Header><TurnSelector /></Header>
  <LeftColumn><PlayerLeaderboard /></LeftColumn>
  <RightColumn>
    <GameSettingsPanel />
    <div className={styles.selectedSlot}>
      <ResolutionPanel />     {/* replaying only */}
      <SelectedInfoPanel />   {/* planning only */}
    </div>
  </RightColumn>
  <Footer><ActionBar /><FpsCounter /></Footer>
  <NextPlayerPopup />
  <VictoryPopup />
  <Tooltip />
</Frame>
```

- `ResolutionPanel.tsx` — strip controls. "Resolve Next" + "Auto" move to `ActionBar`. Detail block remains.
- `GameStore.ts` — add `autoResolve: boolean` + setter. Lift auto-resolve `useEffect` from `ResolutionPanel` into `ActionBar` (or shared hook).
- `GameInfoPanel.tsx` — delete. Logic now lives in `TurnSelector` + `PlayerLeaderboard` + `ActionBar`.

### Confirmed answers

- Layout strategy: Option A (single responsive tree).
- Desktop column width: keep 260px (review visually after build).
- Turn buttons overflow: horizontal scroll.
- Double-tap zoom: three-step cycle.
- Pinch-zoom on touch: keep.
- Footer "Auto" toggle: alongside Resolve Next.
- Next-Player advance: keep `NextPlayerPopup` modal.

## Touch input

### Current

`BabylonJsProvider.tsx:36` calls `camera.attachControl(canvas, true)`. Default `ArcRotateCamera` bindings: mouse left = rotate, right/middle = pan, wheel = zoom; touch 1-finger = rotate, 2-finger pinch = zoom + pan.

### Target

| Device | Gesture | Action |
|---|---|---|
| Touch | 1-finger drag | pan |
| Touch | 2-finger drag | rotate |
| Touch | 2-finger pinch | zoom (kept) |
| Touch | double-tap | three-step zoom cycle |
| Mouse | left drag | rotate |
| Mouse | right/middle drag | pan |
| Mouse | wheel | zoom |
| Mouse | double-click | three-step zoom cycle |

### Implementation

New `src/rendering/GraphBattlesPointersInput.ts` implementing `ICameraInput<ArcRotateCamera>`:

- Replace default pointers input:
  ```ts
  camera.inputs.removeByType('ArcRotateCameraPointersInput');
  camera.inputs.add(new GraphBattlesPointersInput(controller));
  ```
- Keep `ArcRotateCameraMouseWheelInput` (wheel zoom).
- Track active pointers in `Map<number, PointerState>` keyed by `pointerId`.
- Branch on `pointerType`:
  - **Mouse**: left = rotate (`inertialAlphaOffset` / `inertialBetaOffset`), right/middle = pan (`inertialPanningX` / `inertialPanningY`).
  - **Touch, 1 pointer**: delta → pan.
  - **Touch, 2 pointers**: midpoint translation → rotate; distance delta → `inertialRadiusOffset` (pinch zoom).
- Double-tap detection: track last `pointerup` timestamp + position. If Δt < 300ms and Δpos < 10px, call `cameraController.cycleZoom()`.

`CameraController` additions:

```ts
private zoomLevels = [4, 10, 20]; // near, mid, far
private zoomIndex = 1;

cycleZoom(): void {
  this.zoomIndex = (this.zoomIndex + 1) % this.zoomLevels.length;
  // animate camera.radius to this.zoomLevels[this.zoomIndex] using existing Animation pattern (mirror focusOn)
}
```

Move `attachControl` out of `BabylonJsProvider`. Attach inputs inside `CameraController` constructor (canvas via `camera.getEngine().getRenderingCanvas()`).

## Build order

1. Frame grid rewrite + atom split (`TurnSelector`, `PlayerLeaderboard`, `GameSettingsPanel`, `ActionBar`). Delete `GameInfoPanel`. Wire new `App.tsx`.
2. Strip `ResolutionPanel` controls. Lift `autoResolve` to `GameStore`. Move auto-tick effect to `ActionBar`.
3. Visual review on mobile (~375px) + desktop (≥900px). Adjust spacing / overflow as needed.
4. Custom pointers input + double-tap zoom cycle. Test mouse + touch (Chrome devtools touch emulation, real mobile if possible).

## Out of scope

- Restyling individual panel internals beyond layout.
- Changing modal popups (`NextPlayerPopup`, `VictoryPopup`).
- Map/scene rendering changes.
- Tablet-specific breakpoint (single mobile/desktop split via 900px).
