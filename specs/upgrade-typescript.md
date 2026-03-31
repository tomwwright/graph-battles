# Task: Upgrade TypeScript to 6.x

## Goal

Upgrade TypeScript from the current mixed versions (3.x/4.x) to TypeScript 6.x across all packages, with minimal collateral changes. Do **not** upgrade React, MobX, or other `game` package dependencies -- that application is being replaced.

## Current State

| Package | TS Version | Strict | Notes |
|---------|-----------|--------|-------|
| `models` | `^3.0.0` | No | `composite: true`, shared dependency |
| `api` | `^4.2.3` | Yes | Uses project references to `models` |
| `game` | `^3.0.0` | No | Uses `keyofStringsOnly` (removed in TS 5) |
| `ops` | `~3.9.7` | Yes | AWS CDK v1, `noEmit: true` |
| Root | N/A | N/A | `tsc --build` with project references |

## Key Breaking Changes to Address

### Removed/Changed Compiler Options
1. **`keyofStringsOnly`** (`game/tsconfig.json`) -- removed in TS 5.0. Must remove this flag. Code using `keyof` will now resolve to `string | number | symbol` instead of just `string`. May need to add explicit `string &` intersections or `Extract<keyof T, string>` if there are type errors.

### Potentially Affected Patterns
2. **Enum behaviour** -- TS 5.0+ has stricter enum assignability checks. Review enum usage in `models/src/values.ts` (5 numeric enums) and `game/src/game/stores/game.ts` / `ui.ts`.
3. **`experimentalDecorators`** -- still supported in TS 6.x (not removed), so MobX decorators in `game` will continue working.
4. **Implicit `any` in catch clauses** -- TS 4.4+ made catch clause variables `unknown` by default under strict mode. Affects `api` and `ops` (both strict). May need explicit `: any` annotations or proper narrowing.
5. **Template literal types and stricter type narrowing** -- new in TS 4.x/5.x. Unlikely to break existing code but worth verifying during compilation.

### `@types` Compatibility
6. Old `@types` packages may have issues with TS 6.x:
   - `models`: `@types/chai@^3.5.2`, `@types/node@^7.0.18`
   - `game`: `@types/react@^15.0.24`, `@types/node@^7.0.18`, etc.
   - `api`: `@types/node@^15.0.1`, `@types/jest@^26.0.21`
   - `ops`: `@types/node@10.17.27`, `@types/jest@^27.0.2`

   All packages have `skipLibCheck: true` (or `noEmit: true` for ops), which will paper over most `@types` internal issues. We should still upgrade `@types/node` where it's easy (models, api, ops) but leave `game` @types alone per the constraint.

### Dev Tooling Compatibility
7. **Jest** (`api` at v26, `ops` at v26): Upgrade to Jest 30 (latest). Jest 30 has improved ESM support and TS 6 compatibility.
8. **ts-jest** (`api`, `ops`): `ts-jest@^26` does not support TS 6.x. Upgrade to latest ts-jest (compatible with Jest 30 + TS 6).
9. **ts-node** (`api`, `ops`): `ts-node@^9` does not support TS 6.x. Replace with `tsx` -- it's esbuild-based, zero-config, and has no TypeScript version coupling.
10. **@typescript-eslint** (`api`): `@4.19.0` does not support TS 6.x. Upgrade to latest (v8) with ESLint 9 flat config. Defer to separate task if complex.
11. **typedoc** (`api`): `^0.20.35` does not support TS 6.x. Remove unless actively used.
12. **esbuild** (`api`): Not affected -- esbuild doesn't depend on TypeScript version.
13. **Webpack/Babel** (`game`): Not affected -- they process compiled JS output, not TypeScript directly.
14. **Mocha** (`models`, `game`): Runs compiled JS, not affected by TS version.

## Execution Plan

### Phase 1: Upgrade `models` (dependency of all other packages)

1. Update `typescript` version in `packages/models/package.json` to `^6.0.0`
2. Remove any deprecated/removed tsconfig options (none currently identified for models)
3. Run `tsc` in models and fix any compilation errors
4. Run `yarn test` in models and verify tests pass
5. Upgrade `@types/node` to a modern version (e.g. `^20.0.0`)

### Phase 2: Upgrade `api`

1. Update `typescript` version in `packages/api/package.json` to `^6.0.0`
2. Upgrade dev tooling:
   - `jest` to v30, `ts-jest` to latest compatible version, `@types/jest` to latest
   - Replace `ts-node` with `tsx` (update `scripts.cli` and any ts-node references)
   - `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` to latest compatible version (or defer linting upgrade to separate task if complex)
   - Remove `typedoc` unless actively used
3. Upgrade `@types/node` to modern version
4. Run `tsc` in api and fix compilation errors
5. Run `yarn test` in api and verify tests pass

### Phase 3: Upgrade `game`

1. Update `typescript` version in `packages/game/package.json` to `^6.0.0`
2. **Remove `keyofStringsOnly: true`** from `packages/game/tsconfig.json`
3. Do **not** upgrade any runtime dependencies (React, MobX, Phaser, etc.)
4. Do **not** upgrade Webpack, Babel, or other build tooling (they process compiled JS)
5. Run `tsc` in game and fix compilation errors (may be numerous due to `keyofStringsOnly` removal and stricter type checking)
6. Verify `yarn build:client` still works (webpack bundle step)

### Phase 4: Upgrade `ops`

1. Update `typescript` version in `packages/ops/package.json` to `^6.0.0`
2. Upgrade dev tooling:
   - `jest` to v30, `ts-jest` to latest compatible version, `@types/jest` to latest
   - Replace `ts-node` with `tsx` (update any ts-node references)
3. Upgrade `@types/node` to modern version
4. Run `tsc` (type-check only, `noEmit: true`) and fix errors
5. Run `yarn test` in ops and verify tests pass

### Phase 5: Root build verification

1. Run `yarn build` from root (runs `tsc --build --verbose` across all project references)
2. Verify clean build with no errors
3. Ensure `game` and `api` project references to `models` still work correctly

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `keyofStringsOnly` removal causes widespread type errors in `game` | Medium | Add `string &` intersections at specific usage sites; game is being replaced anyway so minimal fixes preferred |
| Old `@types` packages incompatible with TS 6 | Low | `skipLibCheck: true` is already set everywhere; only upgrade @types where needed |
| Jest/ts-jest upgrade to v30 | Medium | Upgrade alongside TypeScript; dev-only so low risk. May need jest.config adjustments for v30 API changes |
| CDK v1 types don't compile under TS 6 | Low | `ops` uses `noEmit: true` and can use `skipLibCheck` if needed |
| Stricter enum checks break existing patterns | Low | Fix at point of error; numeric enums are generally stable across versions |

## Out of Scope

- Upgrading React, MobX, or any `game` runtime dependencies
- Upgrading Webpack or Babel
- Enabling strict mode in packages that don't already have it
- Upgrading AWS CDK v1 to v2
- Any refactoring beyond what's needed for compilation
