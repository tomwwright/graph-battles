# UI kit

React 19 components + hooks + styles that render the gamev2 UI over the Babylon scene. Vanilla React + CSS Modules. Fluent UI is a transitive peer-dep of `@babylonjs/inspector` only — not used here.

## Layout

- `App.tsx` — grid slots (`Frame` / `Header` / `LeftColumn` / `RightColumn` / `Footer`) + floating siblings (popups, tooltip, `MarkerLayer`).
- `main.tsx` provider chain: `GameSessionProvider` → `CursorProvider` → `BabylonJsProvider` → `GameOrchestratorProvider` → `App`.

## Reading + writing state

- `useGameStore(selector)` — narrow subscription via `useSyncExternalStore`. Include `mapRevision` when you derive from `map`.
- `useDispatch()` — returns `(cmd: Command) => void`. Only way UI triggers game-state changes.
- Never touch `renderer`/`store` internals from a component.

## Generic components

Reusable primitives — no coupling to specific game state.

| Component | Purpose | Notes |
|---|---|---|
| `Frame` + slots | Root grid layout | Header / LeftColumn / RightColumn / SelectedSlot / Footer |
| `ExpandablePanel` | Collapsible section | Always uncontrolled (`defaultExpanded`) |
| `DismissableModal` | Overlay + scrollable body | Parent-controlled (`isOpen`/`onDismiss`). Close via X only |
| `Table` | Data table, horizontal grid lines only | Uncontrolled sort. Cell content via `render(row)`. See `specs/content-components.md` |
| `Tooltip` | Cursor-following inline tooltip | Reads `CursorProvider` |

Illustrative usage is in `specs/content-components.md`. Real consumers live alongside game-specific panels.

## Game-specific panels + popups

| Component | Role |
|---|---|
| `TurnSelector` | Header scrubber |
| `PlayerLeaderboard` / `PlayerInfo` | Leaderboard rows |
| `GameSettingsPanel` | Right-column settings display |
| `SelectedInfoPanel` / `TerritoryInfo` / `UnitInfo` / `CombatInfo` | Selection detail |
| `ResolutionPanel` | Replay narration |
| `ActionBar` | Footer buttons (ready / resolve / skip) |
| `NextPlayerPopup` / `VictoryPopup` | Phase-driven overlays |
| `FpsCounter` | Debug FPS |
| `MarkerLayer` / `TerritoryMarker` / `UnitMarker` | Per-frame DOM markers projected from Babylon (uses `useFrameTick`) |

## Styling

- CSS Modules per component (`Foo.module.css`).
- `components/panels.module.css` — shared surface classes (`.panel`, `.heading`, `.button`, `.buttonPrimary`, `.buttonDanger`, `.buttonActive`, `.divider`, `.colourSwatch`).
- `components/Popup.module.css` — shared overlay/popup rules.
- `styles/app.css` — global styles (baseline `button` defaults). Imported once in `main.tsx`.
- Colours: dark surfaces `rgba(0,0,0,0.5)`, monospace font, white text, green/red action buttons.

## Hooks

| Hook | Purpose |
|---|---|
| `useFrameTick(cb)` | Register on `scene.onBeforeRenderObservable`. Fires every frame. Latest closure via ref. |
| `useBabylonObservable(obs, cb)` | Generic Babylon `Observable<T>` subscription. |
| `useMarkerRegistration(...)` | `MarkerLayer` glue for per-frame DOM projection. |

All three are StrictMode-safe (add/remove per mount).

## Rules

- Discrete state changes → `useGameStore` selectors + `useDispatch`.
- 60 fps updates → write to DOM refs from `useFrameTick`. Do not go through React state (see `MarkerLayer`).
- Illegal `(phase, command)` pairs are ignored by handlers — clicks during phase transitions are normal.
- No test suite. Verify with `yarn workspace @battles/gamev2 dev`.
