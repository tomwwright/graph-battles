# Refactor: Move v1 game to /v1/, redirect / → /lobby/

## Context

Originally the v1 game client + lobby were deployed to the S3 bucket root, with `defaultRootObject: "lobby.html"` so visiting the site served the v1 legacy lobby. Since then, a standalone lobby app (`@battles/lobby`) was created at `/lobby/`, and gamev2 lives at `/v2/`. The v1 game is now legacy but should remain accessible at `/v1/` rather than cluttering the root. Visiting `/` should 302 redirect to the new standalone lobby at `/lobby/`.

302 (temporary) redirect chosen over 301 so browsers don't hard-cache and the target can be changed later.

## Changes

### 1. `packages/ops/lib/app-stack.ts`

**a.** Set `defaultRootObject: "index.html"` (semantic default; redirect function takes priority for `/`).

**b.** Add a CloudFront Function for viewer-request that handles redirects:
- `/` or `` → 302 to `/lobby/`
- `/v1` or `/v1/` → 302 to `/v1/lobby.html`

Attach to `defaultBehavior` via `functionAssociations` with `FunctionEventType.VIEWER_REQUEST`.

**c.** Change `DeployApp` S3 deployment: add `destinationKeyPrefix: "v1/"`, remove `exclude` array (no longer needed — v1 is isolated in its own prefix).

### 2. `packages/game/assets/html/index.html`

Change `/build/bundle/` → `/v1/build/bundle/` (script src paths)

### 3. `packages/game/assets/html/lobby.html`

Change `/build/bundle/` → `/v1/build/bundle/` (script src paths)

### 4. `packages/game/assets/html/mobx.html`

Change `/build/bundle/` → `/v1/build/bundle/` and `/build/es5/` → `/v1/build/es5/`

## Not changed

- `pipeline-stack.ts` — build commands unchanged
- `packages/game/package.json` `package` script — zip structure unchanged; paths correct once HTML updated
- `ops.test.ts` — tests `ApiStack` only, unaffected

## Verification

1. `yarn workspace @battles/ops cdk synth` — confirm synth succeeds
2. `yarn workspace @battles/ops test` — confirm ops tests still pass
3. Inspect `cdk.out/` CloudFormation: `defaultRootObject` = `index.html`, CloudFront Function present, `DeployApp` has `destinationKeyPrefix: v1/`
