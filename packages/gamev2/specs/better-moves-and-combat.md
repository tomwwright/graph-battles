# Spec: better moves and combat UI

This change improves the user experience for planning unit moves and for
resolving unit combats during turn replay.

## Overview

- Double-clicking a territory, edge, or unit dispatches the `focus` command to
  select and centre on it — makes it faster to navigate around the map.
- Improve the unit-move indicator (currently a 1px line) with a thicker,
  player-coloured path.
- Update the stub/test map to include an opponent unit on an adjacent
  territory, so combat flows can be exercised in dev mode.
- Improve `CombatInfo`:
  1. For each combatant, break down total points into aggregate line items
     (base per-unit, defender bonuses, starve penalties).
  2. Show an outcome line (units retained / no units remain).
  3. Render a slim per-unit row for every unit involved (below the combatants).
- During replay, display a new bottom-left panel listing the replay phases with
  the current phase highlighted. Purely informational.

Example CombatInfo layout:

```
Combat #T2
---
Player p1  5 pts
  2x unit    +4
  defender   +1
---
Player p2  5 pts
  3x unit    +6
  starved    -1
---
No units remain / Player p1 retains 1 unit
---
● #UR1  [DEFEND]
● #UR2
● #UB1  [STARVE]
...
```

Example phase list:

```
Movement          (current)
Combat
Defenders
Food
Gold
Territory Captures
Territory Actions
```

## Double-click focus

### Input plumbing

Today only single clicks are wired. `HexGridController` registers
`ActionManager.OnPickTrigger` per tile, and clicks on path (edge) cells are
silently ignored. `UnitRenderer` registers `OnPickTrigger` per unit mesh.

Add double-click support via `ActionManager.OnDoublePickTrigger` — Babylon
handles the timing threshold.

- `HexGridController`: new `onDoubleClick(cb: (id: ID) => void)`. Tile handler
  resolves `edgeAtCoord(hex) ?? territoryAtCoord(hex)`, fires `cb(id)`.
- `UnitRenderer`: new `onUnitDoubleClick(cb: (id: ID) => void)`. Same trigger
  on unit meshes.
- `GameRenderer`: expose both as pass-throughs (`onDoubleClick`,
  `onUnitDoubleClick`).

### Command dispatch

`GameOrchestrator` wires both callbacks to
`dispatch({ type: 'focus', id })`. The existing `onFocus` handler already
handles all three cases: territory → select + centre, unit → select + centre,
edge → centre only. No new handler branches needed.

### Files touched

- `src/rendering/HexGridController.ts`
- `src/rendering/UnitRenderer.ts`
- `src/rendering/GameRenderer.ts`
- `src/orchestration/GameOrchestrator.ts`

## Move indicator

Current: `MeshBuilder.CreateLines` produces a 1px `LinesMesh` coloured
`(1, 1, 0.3)`. No thickness, no direction cue.

Replace with `CreateGreasedLine` from `@babylonjs/addons/greasedLine` (already
in deps, `^9.2.0`):

- Width: constant (tune in-code — start ~0.15 world units).
- Colour: owning player's colour (`Values.ColourStrings[player.data.colour]`).
  UnitRenderer already resolves the unit → player.
- `isPickable = false`.
- Waypoints unchanged (same `Navigation.path` + `locationCenter`).

Clean up disposal path — `LinesMesh` replaced by whatever mesh type
GreasedLine returns; keep the `state.destinationLine.dispose()` pattern.

### Files touched

- `src/rendering/UnitRenderer.ts` — `setUnitDestination`, `UnitState`
  type of `destinationLine` field.

## Test map update

`StubGameProvider.createStubGameData` currently seeds one unit (`u1` on
`territories[0]`, owned by `p1`). Add a second unit `u2` on `territories[1]`
owned by `p2` — the alternating owner scheme makes `territories[0]` and
`territories[1]` adjacent territories with opposite owners.

```ts
if (territories.length > 1) {
  dataMap['u2'] = {
    id: 'u2',
    type: 'unit',
    playerId: 'p2',
    locationId: territories[1].id,
    statuses: [],
  };
}
```

Add `'u2'` to the map's `unitIds` array. Bump `nextId` if needed (currently
`100`, leaves plenty of headroom).

### Files touched

- `src/providers/StubGameProvider.ts`

## CombatInfo

`Combatant.combatRating` = `sum(2 + defendBonus - starveBonus)` per unit
(base 2, +1 DEFEND, -1 STARVE). Break the total into aggregate line items.

### Combatant breakdown

For each combatant, render:

- `Player X  <total> pts`
- `Nx unit  +2N` where `N = combatant.units.length`
- `Nx defender  +N` — omit if zero
- `Nx starved  −N` — omit if zero

Computed inline in the component from `combatant.units[*].data.statuses`.
Modifiers must sum to `combatant.combatRating` for internal consistency
(cheap invariant check via a `dev`-mode `console.warn` — or skip if noisy).

### Outcome line

Same formula as `Combat.resolve` (pure computation, no mutation):

```ts
const [a, b] = combat.combatants;   // sorted rating desc
const retained = Math.ceil((a.combatRating - b.combatRating) / 2);
```

- `retained >= a.units.length` → `Player X retains all N units`
- `retained > 0` → `Player X retains N unit(s)`
- `retained <= 0` → `No units remain`

Edge case: single combatant (no opponent) → skip outcome section (shouldn't
occur — `Combat` only constructed at contested locations — but guard the
`combatants.length < 2` branch to avoid a crash).

### Slim unit rows

Below the outcome, list every unit involved (across all combatants):

- Colour swatch (owning player colour, or grey for null-player units).
- Unit id.
- Status chips: `DEFEND`, `STARVE`. Only when present.

New sub-component in `CombatInfo.tsx` (`CombatUnitRow`) — not exported.
Reuses `panels.module.css .colourSwatch` and a small chip style (new class in
`panels.module.css` or inline).

### Files touched

- `src/ui/components/CombatInfo.tsx`
- possibly `src/ui/components/panels.module.css` (chip class)

## Replay phase list

New component `ReplayPhaseList.tsx` — informational panel showing the seven
resolver phases with the current one highlighted.

### Phases (in resolver order)

Matches the `Resolution.phase` union yielded by `resolveTurn`:

1. Movement (`move`)
2. Combat (`combat`)
3. Defenders (`add-defend`)
4. Food (`food`)
5. Gold (`gold`)
6. Territory Captures (`territory-control`)
7. Territory Actions (`territory-action`)

Reuse the `PHASE_LABELS` map from `ResolutionPanel.tsx` — lift it into a
shared spot or duplicate. Recommend lifting to
`src/ui/components/phaseLabels.ts` (new file) so both consumers share it.

### Behaviour

- Reads `currentResolution.phase` and `phase.type` from the store.
- Renders `null` when `phase.type !== 'replaying'`.
- Highlights the row matching `currentResolution.phase`. Only current is
  highlighted — no past-phase ticks (movement↔combat interleaving makes
  "seen" state fuzzy).
- No interactions.

### Placement

Bottom-left. Rendered inside `LeftColumn` in `App.tsx`, after the leaderboard
and Territories button. Because it only renders during `replaying`, it slots
naturally into the same column without a permanent layout footprint.

### Styling

- Vertical list, small monospace, `panels.module.css .panel` surface.
- Current row: bold + accent colour (reuse `.buttonActive` colour or add a
  `.phaseCurrent` class).
- Non-current rows: dimmed (`opacity: 0.6`).

### Files touched

- `src/ui/components/ReplayPhaseList.tsx` (new)
- `src/ui/components/ReplayPhaseList.module.css` (new)
- `src/ui/components/phaseLabels.ts` (new — shared with `ResolutionPanel`)
- `src/ui/components/ResolutionPanel.tsx` (import from `phaseLabels.ts`)
- `src/ui/App.tsx` (mount `<ReplayPhaseList />`)

## Verification

No test suite in `@battles/gamev2`. Validate manually:

1. `yarn workspace @battles/gamev2 exec tsc --noEmit` — type-check clean.
2. `yarn workspace @battles/gamev2 dev` in stub mode (no `gameId`):
   - Double-click a territory: selects + centres. Double-click same territory
     again: no re-selection blink, just re-focus.
   - Double-click an edge: camera centres on edge midpoint, no selection
     change.
   - Double-click a unit: selects unit + centres on unit's current location.
   - Plan a move for `u1` toward `u2` — verify move indicator is thicker and
     red (p1's colour). Plan a move for `u2` — verify blue.
   - Ready both players → replay starts. Combat should trigger on the
     adjacent-territory clash. Confirm CombatInfo shows breakdown, outcome,
     unit rows. Confirm ReplayPhaseList appears bottom-left and current phase
     highlights track resolution stream.

## Out of scope

- Keyboard focus / a11y for double-click.
- Animated dashed move indicator.
- Past-phase ticking in ReplayPhaseList.
- Combat animations.
- Rating breakdown per unit (aggregate only).
