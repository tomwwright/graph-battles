# Phase 5: React UI Panels

## Context

The current `packages/gamev2/src/ui/App.tsx` is a placeholder debug UI. Phase 5 replaces it with proper UI panels that replicate the functionality from `@battles/game` (the old game), using the React component structure and patterns from `babylonjs-tech-demo`.

### Reference roles
- **`@battles/game`** (`packages/game/src/game/components/`): What the final UI should display and how it operates — panel content, data shown, user interactions, game flow (NextPlayer popup, Ready, Victory, resolution replay)
- **`@battles/gamev2`**: Integration points — how components connect to GameStore/UserActionDispatch/GameOrchestrator
- **`babylonjs-tech-demo`**: How React elements should be structured (Frame/Sidebar layout, pointer-events overlay pattern), how to interact with state for updates/dispatch, and how to display a tooltip (Cursor pattern)

## State Changes (prerequisite)

### Add `'next-player'` turn phase

Mirrors the old game's `TurnState.NEXT_PLAYER` flow where a popup appears between players.

**`packages/gamev2/src/state/types.ts`**:
- Add `'next-player'` to `turnPhase` union: `'planning' | 'ready' | 'replaying' | 'victory' | 'next-player'`
- Add `onConfirmNextPlayer(): void` to `UserActionDispatch`

**`packages/gamev2/src/orchestration/GameOrchestrator.ts`**:
- Modify `onReadyPlayer()` (line 96-103): when cycling to next player, set `turnPhase: 'next-player'` instead of staying in `'planning'` — this mirrors the old `UiStore.onClickReady()` which calls `setPlayer()` → sets `TurnState.NEXT_PLAYER`
- Add `onConfirmNextPlayer()`: transitions from `'next-player'` to `'planning'` — mirrors old `UiStore.onClickNextPlayerGo()` which sets the turn

### Add cursor tracking for tooltip

Port the `CursorProvider` pattern from `babylonjs-tech-demo/src/Cursor.tsx`:
- Create `packages/gamev2/src/ui/CursorProvider.tsx` — React context with `{x, y}` screen coordinates, `mousemove` listener on `window`
- The tooltip combines cursor screen position (from CursorProvider) with hover data (from GameStore's `hover` state set by the renderer)

### CSS Module type declaration

Create `packages/gamev2/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
declare module '*.module.css' { const classes: Record<string, string>; export default classes; }
```

## File Structure

```
packages/gamev2/src/ui/
  App.tsx                         # REWRITE: Frame-based composition shell
  CursorProvider.tsx              # NEW: cursor position context (from tech demo Cursor.tsx)
  components/
    Frame.tsx                     # Layout: Frame, Header, SidebarContainer, Sidebar, Footer
    Frame.module.css
    GameInfoPanel.tsx              # Item 17: mirrors old GameInfo.tsx (left sidebar)
    GameInfoPanel.module.css
    PlayerInfo.tsx                 # Player row: mirrors old PlayerInfo.tsx
    SelectedInfoPanel.tsx          # Item 18: mirrors old SelectedInfo.tsx (right sidebar)
    SelectedInfoPanel.module.css
    TerritoryInfo.tsx              # Territory details: mirrors old TerritoryInfo.tsx
    UnitInfo.tsx                   # Unit details: mirrors old UnitInfo.tsx
    ResolutionPanel.tsx            # Item 19: mirrors old ResolveInfo.tsx
    ResolutionPanel.module.css
    CombatInfo.tsx                 # Combat details: mirrors old CombatInfo.tsx
    NextPlayerPopup.tsx            # Item 20: mirrors old NextPlayerPopup.tsx
    VictoryPopup.tsx               # Item 20: mirrors old VictoryPopup.tsx
    Tooltip.tsx                    # Hover tooltip: follows tech demo Tooltip pattern
    Popup.module.css               # Shared popup overlay styles
    panels.module.css              # Shared panel/card styles
```

## Layout Architecture

Ported from tech demo's Frame pattern (`babylonjs-tech-demo/src/components/Frame.tsx`).

The old game has GameInfo on the left, SelectedInfo on the right (`packages/game/src/game/components/Root.tsx`).

```
<CursorProvider>                  cursor position context (from tech demo)
  <Frame>                         pointer-events: none, absolute overlay, flex column
    <Header>                      semi-transparent bg, pointer-events: auto
      Turn selector + phase indicator
    </Header>
    <SidebarContainer>            flex row, space-between, flex: auto
      <Sidebar>                   left: 260px — GameInfoPanel (player list, ready button)
        <GameInfoPanel />
      </Sidebar>
      <Sidebar>                   right: 260px — SelectedInfo or ResolutionPanel
        <SelectedInfoPanel />     during planning/next-player
        <ResolutionPanel />       during replaying
      </Sidebar>
    </SidebarContainer>
    <Footer />                    reserved
    {turnPhase === 'next-player' && <NextPlayerPopup />}
    {turnPhase === 'victory' && <VictoryPopup />}
    <Tooltip />                   follows cursor, pointer-events: none
  </Frame>
</CursorProvider>
```

## Component Details

### Frame.tsx
Port from `babylonjs-tech-demo/src/components/Frame.tsx`. Convert inline styles to CSS Modules. Sidebar width: 260px. Pure layout, no hooks, no game state.

### GameInfoPanel.tsx (Item 17) — mirrors old `GameInfo.tsx` + `PlayerInfo.tsx` + `TurnSelect.tsx`

**What it shows** (from old game):
- Turn selector: turn number buttons 1..N, current turn highlighted, clicking navigates (`dispatch.onSetTurn(turn)`) — from old `TurnSelect.tsx`
- Player list: each player with colour, gold (+production), VP — from old `PlayerInfo.tsx`
- Active player indicator
- "Ready" button when `turnPhase === 'planning'` — from old `GameInfo.tsx` line 62-65
- Camera reset button via renderer

**Sub-components:**
- `PlayerInfo.tsx`: player colour swatch (`Values.ColourStrings[player.data.colour]`), gold with production (`player.data.gold (+totalGoldProduction)`), VP (`player.victoryPoints`), active badge

### SelectedInfoPanel.tsx (Item 18) — mirrors old `SelectedInfo.tsx`

Conditionally renders based on selection type, exactly as old `SelectedInfo.tsx` does:
- When units selected → renders `UnitInfo` for each selected unit
- When territory selected → renders `TerritoryInfo`

**Sub-components:**

`UnitInfo.tsx` — mirrors old `UnitInfo.tsx`:
- Unit ID with player colour
- Location
- Food consumption (`unit.foodConsumption`)
- Statuses: "Defending" for `DEFEND`, "Starving" for `STARVE`
- "Cancel Move" button when unit has `destinationId` and `isPlanning` — calls `dispatch.onCancelMove([unitId])`

`TerritoryInfo.tsx` — mirrors old `TerritoryInfo.tsx` + `TerritoryAction.tsx` + `SelectedTerritoryAction.tsx`:
- Territory ID with owner colour
- Food: `territory.data.food`/`territory.maxFood` (+`territory.foodProduction`)
- Gold: +`territory.goldProduction`
- When owned by current player and planning: action list
  - Each action: label, food/gold cost, "Buy" button (disabled when unaffordable) — from old `TerritoryAction.tsx`
  - Currently pending action: label, cost, "Unbuy" button — from old `SelectedTerritoryAction.tsx`, calls `dispatch.onCancelTerritoryAction(territoryId)`
- Affordability check: `territory.data.food >= cost.food && currentPlayer.data.gold >= cost.gold`, accounting for refund of pending action (logic currently in App.tsx lines 43-61)

### ResolutionPanel.tsx (Item 19) — mirrors old `ResolveInfo.tsx`

**What it shows** (from old game):
- Phase display with human-readable label — from old `ResolveInfo.tsx` `phaseText` map
- Phase-specific detail rendering:
  - `move`, `add-defend` → UnitInfo for the resolution's unit
  - `combat` → CombatInfo for the location
  - `food`, `territory-control`, `territory-action` → TerritoryInfo
  - `gold` → PlayerInfo
- "Resolve Next" button — calls `dispatch.onResolveNext()`
- **Auto-play toggle** (new): local `useState(false)`, `useEffect` with `setTimeout(800ms)` that calls `onResolveNext()` when `autoPlay && currentResolution` — chains automatically as `currentResolution` changes

`CombatInfo.tsx` — mirrors old `CombatInfo.tsx`:
- Location ID
- Each combatant: player colour, combat rating (`combatant.combatRating`)

### NextPlayerPopup.tsx (Item 20) — mirrors old `NextPlayerPopup.tsx`
- Centered overlay modal
- "Turn X/maxTurns" heading
- "Player X you're up!" with player colour — from old NextPlayerPopup
- "Go" button — calls `dispatch.onConfirmNextPlayer()`

### VictoryPopup.tsx (Item 20) — mirrors old `VictoryPopup.tsx`
- Centered overlay modal
- Turn number heading
- Winner(s) with colour and VP count
- "Replay Final Turn" button — calls `dispatch.onSetTurn(game.turn - 1)` then replays

### Tooltip.tsx — follows tech demo `Tooltip.tsx` + `Cursor.tsx` pattern
- Uses `useCursor()` for screen position (from CursorProvider)
- Uses `useGameStore(s => s.hover)` for what's being hovered
- Shows territory ID + food when hovering territory
- Shows edge endpoints when hovering edge
- `pointer-events: none` so it never intercepts clicks
- Positioned at `cursor.x + 10, cursor.y + 10` — same offset as tech demo

## Implementation Order

1. **State changes**: types.ts (`'next-player'` + `onConfirmNextPlayer`), GameOrchestrator.ts, vite-env.d.ts
2. **CursorProvider**: port from tech demo's Cursor.tsx
3. **Frame layout**: Frame.tsx + Frame.module.css (port from tech demo, CSS Modules)
4. **Shared styles**: panels.module.css, Popup.module.css
5. **GameInfoPanel + PlayerInfo**: left sidebar (port from old GameInfo/PlayerInfo/TurnSelect)
6. **SelectedInfoPanel + UnitInfo + TerritoryInfo**: right sidebar (port from old SelectedInfo/UnitInfo/TerritoryInfo/TerritoryAction)
7. **ResolutionPanel + CombatInfo**: resolution replay (port from old ResolveInfo/CombatInfo)
8. **NextPlayerPopup + VictoryPopup**: overlays (port from old popups)
9. **Tooltip**: hover tooltip (follow tech demo pattern)
10. **App.tsx rewrite**: compose everything in Frame layout, wire CursorProvider into main.tsx
11. **Cleanup**: remove dead code from old App.tsx

## Key Files

### To modify
- `packages/gamev2/src/state/types.ts` — add turnPhase + dispatch
- `packages/gamev2/src/orchestration/GameOrchestrator.ts` — next-player flow
- `packages/gamev2/src/ui/App.tsx` — rewrite as composition shell
- `packages/gamev2/src/main.tsx` — add CursorProvider wrapper

### To create
- `packages/gamev2/src/vite-env.d.ts`
- `packages/gamev2/src/ui/CursorProvider.tsx`
- `packages/gamev2/src/ui/components/Frame.tsx` + `.module.css`
- `packages/gamev2/src/ui/components/GameInfoPanel.tsx` + `.module.css`
- `packages/gamev2/src/ui/components/PlayerInfo.tsx`
- `packages/gamev2/src/ui/components/SelectedInfoPanel.tsx` + `.module.css`
- `packages/gamev2/src/ui/components/TerritoryInfo.tsx`
- `packages/gamev2/src/ui/components/UnitInfo.tsx`
- `packages/gamev2/src/ui/components/ResolutionPanel.tsx` + `.module.css`
- `packages/gamev2/src/ui/components/CombatInfo.tsx`
- `packages/gamev2/src/ui/components/NextPlayerPopup.tsx`
- `packages/gamev2/src/ui/components/VictoryPopup.tsx`
- `packages/gamev2/src/ui/components/Tooltip.tsx`
- `packages/gamev2/src/ui/components/Popup.module.css`
- `packages/gamev2/src/ui/components/panels.module.css`

### Reference (old game — what to port)
- `packages/game/src/game/components/Root.tsx` — layout (GameInfo left, SelectedInfo right)
- `packages/game/src/game/components/GameInfo.tsx` — game info panel composition
- `packages/game/src/game/components/PlayerInfo.tsx` — player row display
- `packages/game/src/game/components/TurnSelect.tsx` — turn navigation
- `packages/game/src/game/components/SelectedInfo.tsx` — selection routing
- `packages/game/src/game/components/TerritoryInfo.tsx` — territory details
- `packages/game/src/game/components/UnitInfo.tsx` — unit details
- `packages/game/src/game/components/TerritoryAction.tsx` — action buy button
- `packages/game/src/game/components/SelectedTerritoryAction.tsx` — pending action unbuy
- `packages/game/src/game/components/ResolveInfo.tsx` — resolution replay
- `packages/game/src/game/components/CombatInfo.tsx` — combat details
- `packages/game/src/game/components/NextPlayerPopup.tsx` — next player flow
- `packages/game/src/game/components/VictoryPopup.tsx` — victory screen
- `packages/game/src/game/constants/index.ts` — TerritoryActionTexts, StatusDefinitions

### Reference (tech demo — structural patterns)
- `babylonjs-tech-demo/src/components/Frame.tsx` — layout overlay pattern
- `babylonjs-tech-demo/src/components/Tooltip.tsx` — tooltip rendering
- `babylonjs-tech-demo/src/Cursor.tsx` — cursor position tracking
- `babylonjs-tech-demo/src/SceneState.tsx` — state context pattern
- `babylonjs-tech-demo/src/index.css` — base styling

## Verification

- `cd packages/gamev2 && npx tsc --noEmit` — type check passes
- `cd packages/gamev2 && npx vite dev` — app loads, 3D scene renders
- GameInfoPanel: player list shows colours, gold, VP; turn selector navigates; phase indicator updates
- SelectedInfoPanel: click territory → shows territory details with food/gold/properties; click owned territory during planning → shows action buttons with costs; click unit → shows unit details with statuses
- Territory actions: buy/unbuy actions, affordability correctly computed, pending action shown
- Ready flow: click Ready → NextPlayerPopup appears → click Go → next player plans
- Resolution: all players ready → replaying phase → ResolutionPanel shows phase details → Resolve Next advances → auto-play chains steps → combat shows combatant details
- Victory: VictoryPopup shows winner with VP, replay button works
- Tooltip: follows cursor, shows territory/edge info on hover
- Overlay: clicks pass through to BabylonJS canvas except on interactive UI elements
