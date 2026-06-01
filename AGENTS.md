# AGENTS.md

Operational guide for agents working in this repo. See `README.md` for project blurb and `docs/readme.md` for the in-game manual (rules, territory actions, combat math).

## Project overview

`graph-battles` is a turn-based tactics game played on a graph of territories. Yarn workspaces monorepo of TypeScript packages under `packages/*`. Players issue Actions on Units and Territories; turns resolve simultaneously. Two playable clients exist (v1 Phaser/Mobx, v2 Babylon.js/React) plus a lobby, a domain model package, an API, and CDK infra.

## Toolchain

- Node 24 / Yarn 1.22 (pinned via `.tool-versions`, asdf-compatible)
- TypeScript 6 across all packages
- Top-level build: `yarn build` (runs `tsc --build --verbose` over the project references in `tsconfig.json`)
- Workspaces config in root `package.json` nohoists `@battles/game/**` (v1 Phaser pins ancient React 15 — keep its deps isolated)

## Packages

| Package | Location | Purpose | Notable stack |
|---|---|---|---|
| `@battles/models` | `packages/models` | Pure domain model: Game, Map, Territory, Unit, Player, combat, resolver, action types. Shared by all other packages. | TS, mocha+chai tests (`*.test.ts` next to source). No runtime deps. |
| `@battles/api` | `packages/api` | Express app served via AWS Lambda + DynamoDB (OneTable). Persists games, serves view data. Also publishes a client SDK (`@battles/api/client`). | express, `@codegenie/serverless-express`, `@aws-sdk/client-dynamodb`, `dynamodb-onetable`. Tests in Jest. CLI: `yarn cli`. |
| `@battles/lobby` | `packages/lobby` | Standalone Vite/React 19 lobby app for picking/creating games. Base path `/lobby/`. | Vite 6, React 19, Fluent UI (loaded via gamev2 — lobby itself is plain CSS modules). |
| `@battles/game` | `packages/game` | Original game client. **Legacy** Phaser 2 + Mobx 3 + React 15 + Webpack 2. Compiled with old TS then bundled via webpack. Tests in mocha. Has its own `docker-compose.yml` and `nginx.conf` for local dev. | Phaser-CE, Mobx 3, React 15, Webpack 2. |
| `@battles/gamev2` | `packages/gamev2` | Modern Babylon.js + React 19 game client. Base path `/v2/`. Hex grid renderer, orchestrator pattern syncing model state to scene. Pluggable `GameProvider` (Local / API / Stub). | Vite 6, Babylon.js 9, Fluent UI 9, React 19. |
| `@battles/ops` | `packages/ops` | AWS CDK 2 app: API stack (Lambda+DynamoDB+HttpApi), App stack (S3+CloudFront+Route53 at `battles.tomwwright.com`), Pipeline stack (CodePipeline from GitHub). | aws-cdk-lib v2. Jest tests in `test/`. |

## Common commands

```sh
yarn install                            # install all workspaces
yarn build                              # tsc project-references build (skips game v1 webpack bundle)

# Per-workspace
yarn workspace @battles/models test     # mocha tests against compiled JS in build/
yarn workspace @battles/api test        # jest
yarn workspace @battles/api cli         # tsx src/cli.ts
yarn workspace @battles/lobby dev       # vite dev server
yarn workspace @battles/gamev2 dev      # vite dev server
yarn workspace @battles/gamev2 build    # tsc + vite build
yarn workspace @battles/game dev        # docker compose up (webpack + nginx)
yarn workspace @battles/game test       # compile then mocha
yarn workspace @battles/ops cdk synth   # via "yarn workspace @battles/ops cdk -- <args>"
```

The CI pipeline (see `packages/ops/lib/pipeline-stack.ts`) runs: `yarn install` → `yarn build` → models test → api test → game bundle+package → gamev2 build+package → lobby build+package → ops cdk synth. Match that order when validating changes locally.

## Architecture notes

- **`@battles/models` is the single source of truth** for game state shape. Game data is versioned (v1, v2 envelope) — `@battles/game` only emits v1, `@battles/lobby` writes a versioned envelope that `@battles/game` reads back. Keep both readers compatible when editing serialization (see recent commits `d157eda`, `6f857f5`).
- **gamev2 orchestration**: `GameOrchestrator` (in `src/orchestration`) is the bridge between the model and the Babylon scene. Renderers in `src/rendering` (`MapRenderer`, `UnitRenderer`, `HexGridController`, etc.) are scene-only; state lives in `src/state/GameStore.ts`. Providers in `src/providers` abstract persistence (`LocalGameProvider`, `APIGameProvider`, `StubGameProvider`).
- **Actions are retrieved by `playerId`, not `userId`**. There was a bug here recently (`812bfb9`) — preserve this when touching action lookup.
- **api `models/` directory** is the OneTable schema (not domain models — those live in `@battles/models`).
- **Resolver logic** sits in `packages/models/src/resolver.ts` + `territoryActionResolvers.ts`. Spec for a planned refactor lives at `specs/refactor-resolver-logic-and-state.md`.

## Specs

`specs/` contains design docs for in-flight or completed initiatives. Read the relevant one before large changes:

- `aws-cdk-v2.md`, `upgrade-typescript.md` — completed upgrades, useful as history
- `game-v2-babylonjs.md`, `phase-5-react-ui-panels.md`, `gamev2-mobile-ui-refactor.md`, `gamev2-api-game-provider.md` — gamev2 work
- `standalone-lobby-package.md`, `lobby-ui-improvements.md` — lobby work
- `refactor-resolver-logic-and-state.md` — planned, not started

## Tests

- Models and game v1 use **mocha + chai**, compiling first then running against `build/`. The test file pattern is `*.test.ts` colocated with source. Run via `yarn workspace @battles/<pkg> test`.
- API and ops use **Jest** with `ts-jest`.
- gamev2 and lobby have no test suite currently — verify changes by running their dev servers.

## Conventions

- Prettier: single quotes, trailing commas (es5), width 120, 2-space tabs. Configured per-package in `package.json`.
- ESLint configured in api only (`yarn workspace @battles/api lint`).
- Imports between workspaces use the `@battles/*` package names, not relative paths across packages.
- Do not commit `*/package.zip` or `cdk.out/` — they are build artifacts.

## Deployment

Hosted at `https://battles.tomwwright.com`. Static apps (game v1 at `/`, gamev2 at `/v2/`, lobby at `/lobby/`) served from S3 via CloudFront. API runs as a container Lambda (`Dockerfile` at repo root) behind API Gateway HTTP API. Everything is provisioned and continuously deployed from `master` via the CodePipeline in `@battles/ops`.
