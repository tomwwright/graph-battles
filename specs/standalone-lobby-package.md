# Standalone Lobby Package: Extract and Modernise @battles/lobby

## Context

The lobby application currently lives inside `packages/game/src/lobby/` as a sub-application of `@battles/game`. It is built with the same severely dated stack as the game itself: React 15, MobX 3, Rebass 1, styled-components, and Webpack 2. The game UI is being replaced by `@battles/gamev2` (React 19, BabylonJS 9, Vite — see `specs/game-v2-babylonjs.md`), and the lobby should follow the same modernisation direction so that `@battles/game` can eventually be retired entirely.

### What the lobby does today

1. **Create new game** — configure players (name, colour), turn limit, victory points; create locally (localStorage) or remotely (API)
2. **Browse local saved games** — list, load, delete games stored in localStorage
3. **Browse remote games** — enter a player name, fetch games from the API, filter to games the player is in
4. **Navigate to game** — open the game HTML page with query parameters (`gameId`, `userId`, `local`)

### Current lobby files (8 source files)

```
packages/game/src/lobby/
├── lobby.tsx                      # Entry point — MobX Provider, ThemeProvider, query string parsing
├── containers/
│   ├── Root.tsx                   # Top-level layout: banner, NewGame, saved/remote game lists
│   ├── NewGame.tsx                # Game creation form (class component, @inject MobX)
│   ├── SavedGameList.tsx          # Local games list (inject/observer HOC)
│   └── RemoteGameList.tsx         # Remote games list (inject/observer HOC)
├── components/
│   ├── SavedGameComponent.tsx     # Single saved game card
│   ├── RemoteGameComponent.tsx    # Single remote game card
│   ├── PlayerList.tsx             # Player name/colour list
│   └── NewPlayer.tsx              # Player input (colour picker + name field)
└── stores/
    ├── index.ts                   # RootStore (combines SavedGameStore + RemoteGameStore)
    ├── savedgame.ts               # MobX observable store — localStorage CRUD
    └── remotegame.ts              # MobX observable store — fetch from GameAPI
```

### Cross-package dependencies the lobby imports

| Import | Source | What it provides |
|---|---|---|
| `GameAPI`, `GameSummary` | `game/providers/api.ts` | REST client for the battles API |
| `LocalStorage`, `SavedGame`, `LocalGameProvider` | `game/providers/local.ts` | localStorage CRUD for saved games |
| `ViewData` | `game/stores/phaser.ts` | Type alias `{ [id: string]: { position: { x, y } } }` |
| `GameData`, `GameMap`, `GameMapData`, `PlayerData`, `UserData`, `Utils`, `Values` | `@battles/models` | Core game domain types and utilities |

## Goals

1. **New top-level package** `packages/lobby/` (`@battles/lobby`) — independent of `@battles/game`
2. **React 19** — functional components, hooks
3. **No MobX** — replace with React hooks (`useState`, `useEffect`, `useSyncExternalStore` or plain context)
4. **Vite** — align with `@battles/gamev2` build tooling
5. **Modern TypeScript** — same tsconfig approach as `@battles/gamev2`
6. **Drop Rebass and styled-components** — use CSS Modules (aligning with gamev2 direction) or a lightweight alternative

## Non-goals

- Redesigning the lobby UI or adding new features (visual parity is fine)
- Changing the game API contract
- Modifying `@battles/game` or `@battles/gamev2` (beyond removing lobby assets later)
- Adding a client-side router — query-parameter navigation is sufficient for now

## Architecture

### Package structure

```
packages/lobby/
├── index.html                    # Vite entry HTML
├── package.json                  # @battles/lobby
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                  # Entry point — React 19 createRoot, query string parsing
│   ├── App.tsx                   # Top-level layout (replaces Root container)
│   ├── components/
│   │   ├── NewGame.tsx           # Game creation form (functional component, useState)
│   │   ├── SavedGameList.tsx     # Local saved games list
│   │   ├── RemoteGameList.tsx    # Remote games list
│   │   ├── SavedGameCard.tsx     # Single saved game display
│   │   ├── RemoteGameCard.tsx    # Single remote game display
│   │   ├── PlayerList.tsx        # Player name/colour list
│   │   └── NewPlayer.tsx         # Player input row
│   ├── hooks/
│   │   ├── useSavedGames.ts     # Hook wrapping localStorage CRUD (replaces SavedGameStore)
│   │   └── useRemoteGames.ts    # Hook wrapping GameAPI fetch (replaces RemoteGameStore)
│   ├── services/
│   │   ├── api.ts               # GameAPI client + GameSummary type (extracted from game/providers/api.ts)
│   │   └── local-storage.ts     # LocalStorage class + SavedGame type (extracted from game/providers/local.ts)
│   └── types.ts                 # ViewData and other shared types
├── public/
│   └── (static assets — banner image, map JSONs)
```

### State management: MobX to hooks

The lobby state is simple — two lists and a form. MobX is overkill.

| MobX store | Replacement | Notes |
|---|---|---|
| `SavedGameStore` | `useSavedGames()` hook | Returns `{ games, save, delete, reload }`. Wraps `LocalStorage` class. State via `useState`. |
| `RemoteGameStore` | `useRemoteGames()` hook | Returns `{ games, loading, error, reload }`. Fetches on mount via `useEffect`. State via `useState`. |
| `RootStore` + `<Provider>` | Gone | Hooks are self-contained; no DI container needed. |

### Dependencies

```json
{
  "dependencies": {
    "@battles/models": "0.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^6.0.0",
    "vite": "^6.0.0"
  }
}
```

Notable changes from `@battles/game`:
- **No MobX, mobx-react** — replaced by hooks
- **No Rebass, styled-components** — replaced by CSS Modules
- **No axios** — use `fetch` (built-in, no dependency needed)
- **No query-string** — use `URLSearchParams` (built-in)
- **No babel-polyfill** — modern browsers, Vite handles transforms

### Vite config

Follow the pattern from `@battles/gamev2`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/lobby/',
  optimizeDeps: {
    include: ['@battles/models'],
  },
  build: {
    commonjsOptions: {
      include: [/models/, /node_modules/],
    },
  },
});
```

## Implementation Plan

### Phase 1: Scaffold package and extract providers

1. Create `packages/lobby/` with `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
2. Copy `ViewData` type to `src/types.ts` (it's a simple type alias — no need to keep the import from phaser store)
3. Extract `GameAPI` + `GameSummary` into `src/services/api.ts` — replace axios with `fetch`, keep the same API contract
4. Extract `LocalStorage` + `SavedGame` into `src/services/local-storage.ts` — direct copy, drop the `GameProvider` base class dependency (lobby only uses the static methods)
5. Verify the package builds with `vite build`

### Phase 2: Build hooks (state layer)

1. Implement `useSavedGames()` — wraps `LocalStorage.listGames/saveGame/deleteGame`, returns reactive state via `useState`
2. Implement `useRemoteGames()` — wraps `GameAPI.listGames()`, fetches on mount, returns `{ games, loading, error }`
3. Unit test hooks in isolation (optional but recommended)

### Phase 3: Port components (UI layer)

Convert each component from class/MobX to functional/hooks. Work bottom-up:

1. `NewPlayer.tsx` — presentational, minimal changes beyond syntax modernisation
2. `PlayerList.tsx` — presentational
3. `SavedGameCard.tsx` — presentational (rename from `SavedGameComponent`)
4. `RemoteGameCard.tsx` — presentational (rename from `RemoteGameComponent`)
5. `SavedGameList.tsx` — replace `inject/observer` with `useSavedGames()` hook
6. `RemoteGameList.tsx` — replace `inject/observer` with `useRemoteGames()` hook
7. `NewGame.tsx` — largest component; convert class state to `useState`, replace `@inject('savedGameStore')` with `useSavedGames()`, replace axios asset fetches with `fetch`
8. `App.tsx` — replace `Root`; remove MobX Provider and Rebass ThemeProvider
9. `main.tsx` — `createRoot` entry point, parse `URLSearchParams`

### Phase 4: Static assets and styling

1. Copy banner image (`territory-portrait.jpg`) and map JSON files to `public/`
2. Create CSS Module files for each component (visual parity with current Rebass-based layout)
3. Verify the lobby renders correctly with `vite dev`

### Phase 5: Integration and deployment

1. Add `@battles/lobby` to the workspace and verify `yarn install` resolves correctly
2. Update deployment config (CDK in `@battles/ops`) to deploy lobby bundle at `/lobby/` path
3. Update game navigation URLs if needed — `@battles/gamev2` should link to `/lobby/` instead of `/assets/html/lobby.html`
4. Smoke test: create local game, create remote game, browse games, navigate to game

### Phase 6: Cleanup (deferred)

1. Remove `packages/game/src/lobby/` directory
2. Remove lobby entry point from `packages/game/webpack.config.js`
3. Remove `packages/game/assets/html/lobby.html`
4. This phase should happen after `@battles/gamev2` fully replaces `@battles/game`

## Key decisions

| Decision | Rationale |
|---|---|
| Hooks over MobX | Lobby state is two lists + a form. useState/useEffect is sufficient and eliminates a dependency. Aligns with gamev2 direction (useSyncExternalStore). |
| CSS Modules over styled-components | Aligns with gamev2 spec direction. Zero runtime cost. No new dependency. |
| fetch over axios | Lobby only makes simple GET/PUT calls. fetch is built-in and adequate. |
| Copy providers rather than share | `GameAPI` and `LocalStorage` are small (~60 lines each). Extracting to a shared package adds complexity for little benefit. The lobby copy can diverge from the game copy as needed. |
| Keep query-parameter navigation | Adding React Router is unnecessary for a two-page app. URLSearchParams is built-in. |
