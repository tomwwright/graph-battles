# Spec: Improved mobile UI

Rearrange gamev2 UI for better navigation on small screens: consolidate turn controls into the footer, promote game-level meta/controls into the header, restructure the player leaderboard into expandable rows, and add a units-table modal alongside the existing territories modal.

## Overview

- **Bottom toolbar for turn selector.** Move turn selector and turn status to the footer for easier access on mobile. Action buttons (`Ready`, replay controls) remain in the footer on the right. All turn status and controls now live in the same row.

- **Top toolbar: game info and controls.** Top-right expanding menu (click to reveal a horizontal row of buttons) for `Back to Lobby` and `Concede`. To the left of it, the game id and user id. Left of that, indicator of last time the game saved (by submitting actions etc.), e.g. `✓ Last saved 5 minutes ago`.

- **Improved player info.** `PlayerLeaderboard` becomes a set of `ExpandablePanel` rows, one per player. Far left is an icon indicating local player (user icon) vs remote player (globe with meridians).

  Collapsed
  ```
  ▸ (icon) [colour] [player name] 12 VP 5 Gold (+1) [active] [ready]
  ```

  Expanded
  ```
  ▾ (icon) [colour] [player name] 12 VP 5 Gold (+1)
    VPs 4, 4, 8, 10, 12   (last 5 turns — computed from game.data.maps history)
    Territory #T1 0 VP 2 units   (click territory name opens territories modal)
    Territory #T2 2 VP 1 units
  ```

- **Units table modal.** Mirrors the territories modal. Provides quick reference for full unit state. Each modal (incl. territories) has a `Switch to X` button in its header to swap to the sibling modal.

  Row format
  ```
  [colour indicator] [unit id (link, focuses unit)] [location] [statuses] [current move order, with cancel]
  ```

---

## A. Bottom toolbar (footer)

**Files**
- Edit: `src/ui/App.tsx` — move `<TurnSelector />` from `<Header>` into `<Footer>`, before `<ActionBar />`. Remove `<TurnSelector />` from `<Header>` entirely.
- Edit: `src/ui/components/Frame.module.css` — change `.footer` `justify-content: flex-end` → `space-between` so `TurnSelector` sits left, `ActionBar` right.
- Edit: `src/ui/components/TurnSelector.module.css` — no layout change needed; may need `align-items` alignment tweak to sit inside 50px footer height.

**Rules**
- `FpsCounter` stays in footer (right side, before `ActionBar`).
- If screen too narrow to hold both turn button row and action bar on one line, `TurnSelector`'s turn-number buttons wrap. Acceptable — no responsive breakpoint work required in this pass.

---

## B. Top toolbar (header)

**Files**
- Add: `src/ui/components/HeaderBar.tsx` — new component orchestrating header contents.
- Add: `src/ui/components/HeaderBar.module.css`
- Add: `src/ui/components/GameMenu.tsx` — horizontal-dropdown menu (see below).
- Add: `src/ui/components/GameMenu.module.css`
- Add: `src/ui/components/LastSavedIndicator.tsx`
- Edit: `src/ui/App.tsx` — replace `<TurnSelector />` inside `<Header>` with `<HeaderBar />`.
- Edit: `src/ui/components/Frame.module.css` — `.header` `justify-content: space-between` (was `flex-start`).
- Edit: `src/state/types.ts` — add `lastSavedAt: number | null` to `StoreState`; add StateChange `{ type: 'save/tracked' }` (bumps to `Date.now()`).
- Edit: `src/state/reducer.ts` — handle `save/tracked`.
- Edit: `src/orchestration/handlers/` — in the handler(s) that invoke `provider.action(...)`, dispatch `save/tracked` on success.

### `HeaderBar` layout

Flex row, space-between:

```
[LastSavedIndicator]  [GameIdentity]  [GameMenu]
```

- `LastSavedIndicator`: `<span>✓ Last saved {relative}</span>`. `relative` computed from `lastSavedAt` (`n s ago`, `n m ago`, `n h ago`). Renders `Never` when `lastSavedAt === null`. Uses `setInterval` (10 s) inside the component to keep the relative time fresh. Hidden when there is no session `gameId` (stub mode).
- `GameIdentity`: `<span>{gameId} / {userId}</span>`. Reads from `useGameSession()`. Hidden when stub (no `gameId`).
- `GameMenu`: horizontal dropdown component.

### `GameMenu` component

New custom dropdown (not `ExpandablePanel` — per decision). Layout:

```
[▾ Menu]  ← trigger button
```

On click, expands **inline to the left** (absolute-positioned row anchored to trigger's right edge):

```
[Back to Lobby] [Concede]  [▾ Menu]
```

- Trigger button: `panelStyles.button` composition, caret glyph.
- Local `useState<boolean>` for open. Click trigger toggles; click outside via `useEffect` `document.pointerdown` listener closes.
- Expanded row uses `position: absolute; right: 100%; top: 0; display: flex; gap: 6px; padding-right: 6px;` so buttons appear to the left of the trigger.
- Buttons:
  - **Back to Lobby**: `onClick={() => { window.location.href = '/'; }}`.
  - **Concede**: opens confirm dialog (simple `window.confirm('Concede this game?')` for v1). On confirm, `console.log('[gamev2] Concede requested — not yet implemented')`. Documented in Out-of-scope.

### Wiring `save/tracked`

Find the orchestration handler(s) that call `provider.action(...)`. Candidates (verify): `handlers/readyPlayer.ts`, `handlers/territoryAction.ts`, `handlers/cancelMove.ts` — wherever an `Actions.ModelAction` is submitted. In each success branch, dispatch `{ type: 'save/tracked' }` to the store.

Initial value: `lastSavedAt: null` in `GameOrchestrator.initialise()` (via reducer default).

---

## C. Player expandable rows

**Files**
- Edit: `src/ui/components/PlayerLeaderboard.tsx` — replace inner `<PlayerInfo />` list with `<PlayerRow />` list (renamed conceptually).
- Rewrite: `src/ui/components/PlayerInfo.tsx` — new `PlayerRow` component using `ExpandablePanel`. Keep filename `PlayerInfo.tsx` OR rename to `PlayerRow.tsx`. Recommend rename.
- Edit: `src/ui/components/PlayerLeaderboard.module.css` — drop `.playerRow*` rules that no longer apply. Keep `.container` for the leaderboard flex column.
- Add: `src/ui/components/PlayerRow.module.css` — layout for header row and body.

### `PlayerRow` component

```tsx
type PlayerRowProps = { player: Player; isActive: boolean };
```

Header content (rendered inside `<ExpandablePanel header={...}>`):

```
[localityIcon] [colour swatch] [id] [VP badge] [Gold + prod] [active?] [ready?]
```

- `localityIcon`: `👤` when this player belongs to the session user; `🌐` otherwise. Determined via `game.users.find(u => u.data.playerIds.includes(player.data.id))?.data.id === session.userId`. In stub mode (no `userId`), all players show `👤`.
- Uses existing `panelStyles.small` + colour swatch styling.
- `active` and `ready` badges reuse existing badge styles.

Body content (rendered inside expanded body):

```
VPs 4, 4, 8, 10, 12          ← last 5 turns of VP history
Territory #T1 0 VP 2 units    ← button, opens territories modal
Territory #T2 2 VP 1 units
```

**VP history helper** — new `src/state/vpHistory.ts`:

```ts
export function vpHistory(game: Game, playerId: ID, count: number): number[] {
  const maps = game.data.maps;
  const start = Math.max(0, maps.length - count);
  return maps.slice(start).map((mapData) => {
    const map = new GameMap(mapData);
    return map.player(playerId).victoryPoints;
  });
}
```

Called with `count = 5`. Rendered as comma-separated list.

**Territory click** — each territory row renders as a `<button>` that dispatches `nothing on the player side` but triggers the parent's `onOpenTerritories()` callback (prop drilled from `<PlayerLeaderboard>` → `<PlayerRow>`). Parent lifts modal state.

Territory rows show:
- `Territory #Tn` — link
- `n VP` — `t.data.properties.length + 1` (properties + control base). Reuse existing computation from territory model if present.
- `n units` — `t.units.length`

### Session wiring

`PlayerLeaderboard` needs `session.userId` for locality. Call `useGameSession()` inside `PlayerLeaderboard`, pass `sessionUserId` down to each `PlayerRow`.

---

## D. Units table modal + modal switcher

**Files**
- Add: `src/ui/components/UnitsModal.tsx`
- Add: `src/ui/components/ModalContainer.tsx` — manages `openModal` state, renders exactly one of the two modals.
- Edit: `src/ui/components/TerritoriesModal.tsx` — accept new prop `onSwitch?: () => void`; when provided, render `Switch to Units` button in header.
- Edit: `src/ui/components/DismissableModal.tsx` — extend `title` region to accept a `headerExtras?: ReactNode` slot placed left of the close button. Alternatively, accept `title` as `ReactNode` (already does) and let consumers embed the switch button inside the title — simpler; no `DismissableModal` change needed.
- Edit: `src/ui/App.tsx` — replace direct `<TerritoriesModal>` mount with `<ModalContainer>` (and its trigger buttons in `LeftColumn`).

### `ModalContainer`

```tsx
type OpenModal = 'territories' | 'units' | null;

export function ModalContainer({ open, onDismiss, onSwitch }: { ... }) {
  return (
    <>
      <TerritoriesModal
        isOpen={open === 'territories'}
        onDismiss={onDismiss}
        onSwitch={() => onSwitch('units')}
      />
      <UnitsModal
        isOpen={open === 'units'}
        onDismiss={onDismiss}
        onSwitch={() => onSwitch('territories')}
      />
    </>
  );
}
```

`LeftColumn` in `App.tsx` renders:

```tsx
<button onClick={() => setOpenModal('territories')}>Territories</button>
<button onClick={() => setOpenModal('units')}>Units</button>
```

State `openModal` lifted to `App.tsx`.

### `UnitsModal`

Mirrors `TerritoriesModal`. Row shape:

```ts
type UnitRow = {
  id: ID;
  ownerId: ID | null;
  ownerColour: string;
  locationId: ID;
  locationLabel: string;   // territory id or "edge #E12 (#T1↔#T2)"
  statuses: Values.UnitStatus[];
  move: ID | null;         // destination location id
};
```

Columns:
- `owner` (colour swatch, sortable by playerId)
- `id` — focus-link button (`focus` dispatch → close modal)
- `player` — player id, coloured
- `location` — label, focus-link on click
- `statuses` — icon chips (defend / starve) reusing existing icon components/styles if any; else plain text `DEFEND`, `STARVE`
- `move` — destination label + `Cancel` button (`dispatch({ type: 'cancel-move', unitIds: [r.id] })`). Disabled when phase !== 'planning' or no pending move.

Location label: if location is a Territory, `#T…`. If Edge, `#E… (#Ta↔#Tb)`.

Sort key defaults: `owner` asc.

### Switch button placement

Inside each modal's title node (no `DismissableModal` change):

```tsx
<DismissableModal
  isOpen={isOpen}
  onDismiss={onDismiss}
  title={
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      Territories
      <button className={panelStyles.button} onClick={onSwitch}>Switch to Units →</button>
    </span>
  }
>
```

---

## E. Left column reflow (small touch-up)

`LeftColumn` after refactor:

```
<PlayerLeaderboard />        ← expandable rows
<button>Territories</button>
<button>Units</button>
<ReplayPhaseList />          ← unchanged, still margin-top: auto
```

`GameSettingsPanel` stays in `RightColumn`, unchanged.

---

## Verification

1. `yarn workspace @battles/gamev2 exec tsc --noEmit` — type-check clean.
2. `yarn workspace @battles/gamev2 build` — Vite build succeeds.
3. Smoke test `yarn workspace @battles/gamev2 dev`:
   - **A**: TurnSelector in footer left, Ready/Next buttons in footer right. Phase badge visible.
   - **B**: Header shows `✓ Last saved …`, `gameId/userId`, `▾ Menu` at right. Click Menu — `Back to Lobby` + `Concede` appear to the left of the trigger; click outside closes menu. Concede opens confirm; on confirm, console logs stub message. `Back to Lobby` navigates to `/`. In stub mode (no `?gameId`), left header cluster is empty.
   - **C**: PlayerLeaderboard shows expandable rows. Header row shows locality icon (`👤` for session user's players, `🌐` for others), colour, id, VP, gold (+prod), plus active/ready badges. Expand — VP history line + territory list appear. Click a territory row → territories modal opens.
   - **D**: Territories button opens territories modal; Units button opens units modal. Modal header includes `Switch to X →` button that closes current modal and opens the sibling. Focus-links inside modals dispatch `focus` and close the modal.
4. Confirm no regressions in existing components (`ResolutionPanel`, `ReplayPhaseList`, `CombatInfo`, marker layer, tooltip).

## Out of scope

- No true `Concede` model action. Confirm dialog + console stub only. Follow-up: add `Actions.ConcedeAction` in `@battles/models`, plumb through providers.
- No responsive breakpoint work beyond the existing `@media (min-width: 900px)` rules in `Frame.module.css`. TurnSelector button row may wrap on narrow footers — acceptable.
- No portal/focus-trap/keyboard-dismiss on modals (matches existing conventions per prior plan).
- No animation transitions.
- No i18n on `Last saved` relative time; hard-coded English.
- No lobby route: `Back to Lobby` navigates to `/`, assumed to be the lobby.
- Icons for locality (`👤` / `🌐`) use emoji glyphs. No SVG icon system introduced in this pass.
