# Content Components

Generic reusable UI primitives in `packages/gamev2/src/ui/components/`. Decoupled from any specific game use case — callers compose them with their own content.

## Context

`packages/gamev2/` UI is built from bespoke panels (`PlayerLeaderboard`, `GameSettingsPanel`, `SelectedInfoPanel`, `ResolutionPanel`) and bespoke popups (`NextPlayerPopup`, `VictoryPopup`). Each rolls its own surface div and visibility wiring. As the UI grows (richer per-player detail, full-territory listings, planned-moves overviews) two reusable primitives are needed:

1. **`ExpandablePanel`** — collapsible section. Header always visible, click to toggle body.
2. **`DismissableModal`** — overlay with header + scrollable content + close button. Parent owns open state.

## Conventions reused

- **Styling**: CSS Modules (every other component in the package uses them). Fluent UI v9 is in `package.json` only as a transitive peer-dep of `@babylonjs/inspector` — not used by application UI.
- Shared style helpers: `panels.module.css` (`.panel`, `.heading`, `.button`, …) and `Popup.module.css` (`.overlay`, `.popup`).
- Floating UI renders as a sibling of `<Frame>`'s grid slots, relying on `position: absolute; inset: 0` + `z-index`.

## `ExpandablePanel`

**Always uncontrolled.** Owns its own `expanded` state via `useState`. Initial value comes from `defaultExpanded` (default `false`). No animation. Outer surface composes the existing `.panel` class so consumers visually match other panels.

```tsx
type ExpandablePanelProps = {
  header: ReactNode;          // clickable content
  children: ReactNode;        // body, rendered only when expanded
  defaultExpanded?: boolean;  // default false
  className?: string;         // optional extra class on outer wrapper
};
```

Markup:
- Outer `<div>` — composes `panels.panel`.
- Header `<button type="button" aria-expanded aria-controls={bodyId}>` — flex row of caret (`▸`/`▾`) + `header` content. Button reset to inherit surface styles.
- Body `<div id={bodyId} role="region">` — conditionally rendered.

`bodyId` from `useId()`.

## `DismissableModal`

**Parent-controlled.** Consumer owns `isOpen` and `onDismiss`. Mirrors the visibility-via-prop pattern of existing popups.

**Single dismiss surface**: the close button (`×`) in the header. No backdrop click. No Escape key. (Deliberate — no keyboard handling exists in the UI yet; defer to a later accessibility pass.)

```tsx
type DismissableModalProps = {
  isOpen: boolean;
  onDismiss: () => void;
  title: ReactNode;     // header content
  children: ReactNode;  // scrollable body
};
```

Markup (when `isOpen`):
- `.overlay` — full-window absolute backdrop, centred flex. Same rules as `Popup.module.css .overlay`.
- `.modal` — `max-width: min(720px, 90vw); max-height: 80vh; display: flex; flex-direction: column`. Larger than existing popups because content is lists/tables.
- `.header` — flex row, `title` left, close button right, border-bottom separator.
- `.closeButton` — composes `panels.button`. `aria-label="Close"`. Calls `onDismiss`.
- `.body` — `flex: 1; overflow-y: auto;`. The scrollable region (key differentiator from existing popups).

No portal. Consumer renders the modal as a sibling alongside other floating UI.

## Usage (illustrative — not part of initial change)

```tsx
<ExpandablePanel header={<PlayerName id={p.id} />}>
  <PlayerStats id={p.id} />
</ExpandablePanel>

const [open, setOpen] = useState(false);
<button onClick={() => setOpen(true)}>Territories</button>
<DismissableModal isOpen={open} onDismiss={() => setOpen(false)} title="All territories">
  <TerritoryTable />
</DismissableModal>
```

## `Table`

Generic data table. Native `<table>` semantics, horizontal grid lines only, optional header row, optional per-column sort. Cell content may include buttons/links — caller decides via the column's `render` callback.

**Sort is uncontrolled.** Owns its own sort state via `useState`. Initial sort comes from `defaultSort`. Click a sortable header to toggle direction (asc → desc → asc). Click a different sortable column to switch and reset to asc.

```tsx
type Column<T> = {
  key: string;                         // stable identifier; used as react key + sort target
  header?: ReactNode;                  // omit when entire row has no header (e.g. action column)
  render: (row: T) => ReactNode;       // cell body
  sortValue?: (row: T) => string | number;  // required if sortable
  align?: 'left' | 'right' | 'center'; // default left
  width?: string;                      // optional CSS width passed to <col>
};

type TableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  showHeader?: boolean;                // default true
  emptyState?: ReactNode;              // shown when rows empty; default nothing
  className?: string;
};
```

Markup:
- `<table>` — `border-collapse: collapse; width: 100%`.
- Optional `<colgroup>` if any column has `width`.
- `<thead>` only when `showHeader !== false`. Sortable header is a `<button type="button">` inside `<th>` (semantic). Sort indicator: ` ▲`/`▼` suffix on active column; sortable-but-inactive shows faint ` ⇅` to signal affordance.
- `<tbody>` rows: `border-bottom` on each `<tr>` (horizontal lines only). No vertical borders anywhere.
- Cells padded (`padding: 6px 8px`). Align via `text-align`.
- Empty rows → renders `<tbody>` with single full-span row containing `emptyState`, else `null`.

Sorting:
- Columns flagged sortable by presence of `sortValue`. Header click only registers on those.
- Stable sort: `Array.prototype.sort` is stable since ES2019.
- Non-mutating: clone rows before sort.

## Files

```
packages/gamev2/src/ui/components/ExpandablePanel.tsx
packages/gamev2/src/ui/components/ExpandablePanel.module.css
packages/gamev2/src/ui/components/DismissableModal.tsx
packages/gamev2/src/ui/components/DismissableModal.module.css
packages/gamev2/src/ui/components/Table.tsx
packages/gamev2/src/ui/components/Table.module.css
```

## Out of scope

- Animations (matches existing zero-animation panels).
- Keyboard dismiss / focus trap (future a11y pass).
- Portal rendering (matches existing siblings-of-Frame pattern).
- Real consumer integrations (separate follow-up).
- Fluent UI adoption.

## Verification

No test suite in `@battles/gamev2`.

1. `yarn workspace @battles/gamev2 build` — type-check passes.
2. Manually smoke-test in `dev` mode by dropping each component into a slot in `App.tsx`. Confirm panel toggles, modal opens/closes via prop, body scrolls, close button dismisses, backdrop click does NOT dismiss. Revert the harness before commit.
