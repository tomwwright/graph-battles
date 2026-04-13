# Lobby UI Improvements

## UI Layout

### Default state (player name set)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    [ banner image ]                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  New Game                                                    │
│                                                              │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │ Players                     │ │ Settings                │ │
│  │                             │ │                         │ │
│  │  🟥  Tom              [✏️]  │ │ Turn Limit: 10 turns    │ │
│  │  🟦  [ Player Name     ]   │ │ ━━━━━━━━●━━━━━━━━━━━━━  │ │
│  │  [+]                       │ │                         │ │
│  │                             │ │ Victory Points: 25 pts  │ │
│  │                             │ │ ━━━━━━━━━━●━━━━━━━━━━━  │ │
│  │                             │ │                         │ │
│  │                             │ │ [ Create Game ]         │ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Local ○━━● Remote                                           │
│                                                              │
│  Playing as: Tom                                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ AXMKQR        Turn 3/10              [ Open ] [ Delete ]││
│  │ 7 territories  VP 12/25                                  ││
│  │ Tom and Alex   Updated 2 hours ago                       ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │ BFTNWP        Turn 7/10              [ Open ] [ Delete ]││
│  │ 7 territories  VP 20/25                                  ││
│  │ Tom and Sam    Updated 3 days ago                        ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ⚙ Settings ▸                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### First visit (no player name stored)

```
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  New Game                                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ ℹ️  Set your player name to get started                  ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │ Players                     │ │ Settings                │ │
│  │                             │ │                         │ │
│  │  🟥  [ Your Name       ]   │ │ ...                     │ │
│  │  🟦  [ Player Name     ]   │ │                         │ │
│  ...                                                         │
```

### Player 1 edit mode (after clicking pencil icon)

```
│  │  🟥  [ Tom             ]   │
```

### Settings panel expanded

```
│  ⚙ Settings ▾                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Game Client:   v1 ●━━○ v2                               ││
│  └──────────────────────────────────────────────────────────┘│
```

---

## 1. Game Mode Toggle (Local / Remote)

### Current behaviour

The lobby uses a `gameType` query parameter (`?gameType=local` or `?gameType=remote`) to switch between showing local saved games and remote games. This is parsed in `main.tsx` and threaded through as a prop. The "Enter Player Name" form in the remote view also navigates via query param (`?gameType=remote&userId=...`).

### Proposed behaviour

Replace the query parameter with a toggle switch in the UI, persisted to localStorage.

**Placement:** Below the "New Game" section, above the divider. The toggle controls which game list section renders beneath it — "Local Saved Games" or "Remote Games". This keeps the new-game form always visible (it already accepts both modes) and puts the toggle close to the content it controls.

**Persistence:** Store the selected mode under a localStorage key (e.g. `graph-battles-lobby-gameMode`). Default to `local` when no value is stored.

**Changes:**
- Remove `gameType` from URL parsing in `main.tsx`
- Add a `useGameMode()` hook that reads/writes localStorage and exposes `[mode, setMode]`
- `App.tsx` calls `useGameMode()` and renders the toggle + conditional game list
- `NewGame` receives `gameType` from the same hook instead of from URL
- Remove the `?gameType=...` query parameter entirely — the lobby is now a single URL

### Toggle design

A toggle switch labelled "Local" / "Remote" (or with the labels either side of the switch). Toggling it swaps which game list section appears below and also controls whether `NewGame` creates a local or remote game.

---

## 2. Player Name / Identity

### Current behaviour

The player name is used in two disconnected places:
1. **NewGame form** — the user enters names for each player slot. For remote games, the first player's name becomes their userId.
2. **Remote game list** — a separate "Enter player name" form sets `userId` via query param, used to filter the game list.

There's no persistence — the user re-enters their name every time they visit.

### Proposed behaviour

Introduce a persistent "player identity" stored in localStorage — a single player name that the lobby remembers.

**Persistence:** Store under `graph-battles-lobby-playerName`. Expose via a `usePlayerName()` hook returning `[name, setName]`.

**UI placement:** The first player slot in the NewGame form *is* the player identity. No separate header or settings element.

**Player 1 slot states:**

- **No stored name (first visit):** A small CTA banner appears above/within the NewGame form (e.g. "Set your player name to get started"). The player 1 slot starts in edit mode as an input field, matching the style of other player name inputs.
- **Name stored:** The player 1 slot displays the stored name as static text, visually distinct from the other editable player slots (e.g. slightly different background or text weight). A small edit icon (pencil) sits beside the name. Clicking the edit icon transforms the slot back into an editable text input. Blur or enter saves the new name to localStorage and returns to the static display.

**Integration with NewGame:**
- Player 1 name always comes from `usePlayerName()` — it is not part of the mutable `players` form state
- Other player slots (2, 3, 4) remain fully editable as before
- For remote games, the stored name is used as the userId when calling `createGame`

**Integration with game lists:**
- Both the local and remote game list sections display a "Playing as: {name}" indicator at the top, reinforcing the current identity outside the form
- Remote game list uses the stored name automatically to filter games — the separate "Enter player name" form is removed
- If no name is stored, the game list section shows a prompt directing the user to set their name in the form above

### Design decisions

- **No separate header element.** The player 1 slot is the single source of truth for player identity.
- **No warning on name change.** Changing the name means old remote games won't appear in the filtered list, but the UI feedback of games disappearing is sufficient for the user to understand and change back if needed.
- **CTA banner on first visit.** A small, dismissable (or auto-hiding once name is set) banner in the NewGame form area prompts name entry. Avoids a separate onboarding flow.

---

## 3. Game Client Version Toggle (v1 / v2)

### Current behaviour

The lobby always opens games in the v1 client (`/assets/html/index.html?gameId=...`). There is no awareness of v2.

### Proposed behaviour

Add a hidden settings panel (collapsed by default) with a toggle to select which game client version to use. This setting affects:

1. **Game open URL** — where "Open" buttons redirect to
2. **View data format** — what view data is stored alongside the game when creating a new game

**UI placement:** A collapsible "Settings" or gear icon section, either:
- At the bottom of the lobby (expandable section), or
- In a header bar alongside the player name (gear icon that expands a panel)

**Persistence:** `graph-battles-lobby-clientVersion` in localStorage, values `v1` | `v2`. Default to `v1`.

**Impact on game URLs:**
- v1: `/assets/html/index.html?gameId={id}` (local) or `?gameId={id}&userId={name}` (remote)
- v2: `/v2/?gameId={id}` (local) or `/v2/?gameId={id}&userId={name}` (remote)

> **Note:** v2 doesn't currently support loading a game by `gameId` query param — it uses `StubGameProvider` and loads a hardcoded map. This will need to be addressed in gamev2 before the lobby can meaningfully open v2 games. For now, the toggle can control the URL and view data format, with v2 support being incomplete until gamev2 gains a real game provider.

**Impact on game creation (view data):**

This is the more significant change. When the lobby creates a new game, it currently stores v1-format `ViewData` alongside the `GameData`. With v2, the lobby needs to store the ASCII map text instead.

See section 4 for the view data design.

### Design decisions

- **Default:** `v1`. Switch to defaulting to `v2` once gamev2 supports loading games by ID.
- **Hidden by default.** Collapsed behind a gear icon or expandable "Settings" section to avoid confusing users who don't know what v1/v2 means.

---

## 4. View Data: v1 vs v2 Formats

### Current formats

**v1 ViewData** — pixel coordinates for Phaser 2D rendering:
```json
{
  "#T1": { "position": { "x": 0, "y": 0 } },
  "#T2": { "position": { "x": 200, "y": -300 } }
}
```

Stored per-game via the API (`PUT /game/{id}/view`) and in localStorage (embedded in `SavedGame`).

**v2 RenderMap** — derived at runtime from an ASCII text map:
```
_gT_ggT
g_gT__g
g__g_T_
gT_Tg__
_gg____
```

Currently loaded from a static `.txt` file in gamev2's `public/maps/`. The v2 client parses this into a `RenderMap` (territory hex coords, grass cells, edges) at load time. It is **not** stored alongside the game data.

### The problem

The lobby creates games and stores view data so that the game client can render the map. v1 and v2 need different view data formats:

- v1 needs: `ViewData` (JSON with pixel coords) — stored alongside game
- v2 needs: ASCII map text — needs to be retrievable by the game client

These are fundamentally different: v1's view data is a computed layout, while v2's is a source format that gets parsed into a layout.

### Proposed approach

Store the view data in a version-aware wrapper:

```typescript
type VersionedViewData =
  | { version: 'v1'; data: ViewData }       // pixel coordinates
  | { version: 'v2'; data: string };         // ASCII map text
```

**At game creation time** (in the lobby):
- If client version is v1: fetch the `.map.json` and `.view.json` files as today, wrap as `{ version: 'v1', data: viewJson }`
- If client version is v2: fetch the `.map.json` and corresponding `.txt` file, wrap as `{ version: 'v2', data: asciiText }`

**Storage:**
- Local games: stored in the `SavedGame.viewData` field (now `VersionedViewData` instead of `ViewData`)
- Remote games: stored via `PUT /game/{id}/view` (API is payload-agnostic, it just stores JSON)

**At game load time** (in the game client):
- v1 client: unwraps `data` and uses it as `ViewData` (backwards compatible if version field is missing)
- v2 client: unwraps `data` string and passes it to `parseMap()`

### Map files for v2

The lobby currently has v1 map files in `public/maps/`:
- `lobby.map.{N}players.json` — GameMapData
- `lobby.view.{N}players.json` — v1 ViewData

For v2 we need corresponding ASCII map files:
- `lobby.map.{N}players.txt` — ASCII hex map for v2

### Design decisions

**Shared GameMapData, separate view files.** Both v1 and v2 use `lobby.map.{N}players.json` for game data creation. The lobby fetches the appropriate view file based on the client version setting:
- v1: `lobby.view.{N}players.json` (pixel coordinates)
- v2: `lobby.view.{N}players.txt` (ASCII hex map)

New v2 ASCII maps will be hand-crafted to match the topology of the existing `.map.json` files. Territory IDs are assigned left-to-right, top-to-bottom in the ASCII parser (`#1`, `#2`, ...), so the maps must be authored such that this ordering matches the ID ordering in the corresponding `.map.json`. This means v1 and v2 games have identical game state — only the rendering differs.

**Backwards compatibility:** Treat missing `version` field as `v1`. Existing local saves and remote view data payloads continue to work without migration.

**No API changes.** The `PUT /game/{id}/view` endpoint stores arbitrary JSON. The payload shape changes (gains a `version` wrapper) but the endpoint itself is unmodified. Game clients handle both the legacy unwrapped shape and the new versioned shape.

### Open items

- **v2 ASCII maps** — need to be authored for 2, 3, and 4 player configurations with topology matching the existing `.map.json` files
- **gamev2 game loading** — v2 client needs to support loading a game by `gameId` query param (currently uses `StubGameProvider` with a hardcoded map). Until this is implemented, the v2 toggle controls URL and view data format but v2 games won't actually load

---

## Implementation Plan

### New hooks

| Hook | localStorage key | Type | Default |
|---|---|---|---|
| `usePlayerName()` | `graph-battles-lobby-playerName` | `[string, (name: string) => void]` | `''` |
| `useGameMode()` | `graph-battles-lobby-gameMode` | `['local' \| 'remote', (mode) => void]` | `'local'` |
| `useClientVersion()` | `graph-battles-lobby-clientVersion` | `['v1' \| 'v2', (version) => void]` | `'v1'` |

All three follow the same pattern: read initial value from localStorage, return state + setter that writes to both React state and localStorage.

### Updated types

```typescript
// src/types.ts
type V1ViewData = { [id: string]: { position: { x: number; y: number } } };

type VersionedViewData =
  | { version: 'v1'; data: V1ViewData }
  | { version: 'v2'; data: string };

// Backwards compat: legacy data has no version field
type StoredViewData = VersionedViewData | V1ViewData;
```

### Component changes

**New: `SettingsPanel`** — collapsible (gear icon trigger), contains:
- Client version toggle (v1 / v2)

**New: `PlayerIdentity`** — the player 1 slot component, renders two modes:
- **Display mode:** static name text (visually distinct) + pencil edit icon
- **Edit mode:** text input (same style as other player slots), blur/enter saves to localStorage via `usePlayerName()`
- Starts in edit mode when no stored name exists

**New: `PlayerNameCta`** — small banner shown in NewGame when no player name is stored. Auto-hides once name is set.

**Updated: `App`**
- Owns `useGameMode()` state, renders toggle switch between "New Game" and game list sections
- Passes `gameType` and `clientVersion` down to `NewGame`
- Removes `userId` prop — `RemoteGameList` reads from `usePlayerName()` directly
- Removes all query parameter handling from `main.tsx`
- Settings gear icon placed near the game mode toggle or at the bottom of the lobby

**Updated: `NewGame`**
- Receives `clientVersion` prop to determine view data format
- Player 1 slot replaced with `PlayerIdentity` component (reads/writes `usePlayerName()`)
- Remaining player slots (2, 3, 4) behave as before
- CTA banner shown when `usePlayerName()` returns empty string
- Game creation fetches view file based on client version:
  - v1: `lobby.view.{N}players.json`
  - v2: `lobby.view.{N}players.txt`
- Wraps view data in `VersionedViewData` before saving

**Updated: `SavedGameCard` / `RemoteGameCard`**
- Game open URL determined by `clientVersion` setting:
  - v1: `/assets/html/index.html?gameId={id}[&userId={name}]`
  - v2: `/v2/?gameId={id}[&userId={name}]`
- `clientVersion` provided via prop or context

**Updated: `RemoteGameList`**
- No longer needs `userId` prop — reads from `usePlayerName()` directly

**Removed:**
- `EnterPlayerId` component in `App.tsx` — no longer needed
- `userId` / `gameType` query parameter parsing in `main.tsx`

### Phasing

1. **Player name + game mode toggle** — can be implemented together as they're both localStorage-backed hooks that simplify the existing UI
2. **Client version toggle + versioned view data** — depends on the v2 ASCII map files being authored; the UI toggle and `VersionedViewData` type can be built first, with v2 game creation gated on map files existing
