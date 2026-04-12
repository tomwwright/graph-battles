# AWS CDK v1 to v2 Migration Plan

## Overview

Migrate `packages/ops` from AWS CDK v1 (1.138.0) to AWS CDK v2. CDK v1 has been in maintenance mode since June 2023 and is end-of-life.

The main structural change in CDK v2 is that all AWS construct libraries are consolidated into a single `aws-cdk-lib` package, and the `constructs` package is a separate peer dependency.

## Current State

- **CDK version**: v1 (1.138.0) across all `@aws-cdk/*` packages
- **Note**: `aws-cdk-lib` ^2.0.0 is already listed in dependencies but unused
- **Files to migrate**: 5 source files + package.json + cdk.json

### Source files and their CDK imports

| File | v1 packages used |
|------|-----------------|
| `bin/ops.ts` | `@aws-cdk/core` |
| `lib/app-stack.ts` | `@aws-cdk/core`, `aws-certificatemanager`, `aws-cloudfront`, `aws-route53`, `aws-route53-targets`, `aws-s3`, `aws-s3-deployment` |
| `lib/api-stack.ts` | `@aws-cdk/core`, `aws-apigatewayv2`, `aws-apigatewayv2-integrations`, `aws-dynamodb`, `aws-lambda` |
| `lib/pipeline-stack.ts` | `@aws-cdk/core`, `aws-iam`, `aws-ssm`, `@aws-cdk/pipelines` |
| `test/ops.test.ts` | `@aws-cdk/assert`, `@aws-cdk/core` |

---

## Step 1: Update dependencies in `package.json`

**Remove** all v1 `@aws-cdk/*` packages from `dependencies` and `devDependencies`:
- `@aws-cdk/core`
- `@aws-cdk/aws-apigatewayv2`
- `@aws-cdk/aws-apigatewayv2-integrations`
- `@aws-cdk/aws-cloudfront`
- `@aws-cdk/aws-dynamodb`
- `@aws-cdk/aws-lambda`
- `@aws-cdk/aws-route53-targets`
- `@aws-cdk/aws-s3-deployment`
- `@aws-cdk/pipelines`
- `@aws-cdk/assert`

**Add/update**:
- `aws-cdk-lib` (already present at `^2.0.0` -- keep or pin to a recent version e.g. `^2.180.0`)
- `constructs` `^10.0.0` (new peer dependency required by CDK v2)
- `aws-cdk` in devDependencies: upgrade from `1.138.0` to `^2.180.0`

**Keep**: `source-map-support`, all non-CDK dev deps unchanged.

## Step 2: Update imports in all source files

All `@aws-cdk/aws-*` imports become submodule imports from `aws-cdk-lib`. The `Construct` type moves to the `constructs` package.

| v1 import | v2 import |
|-----------|-----------|
| `@aws-cdk/core` | `aws-cdk-lib` |
| `@aws-cdk/aws-certificatemanager` | `aws-cdk-lib/aws-certificatemanager` |
| `@aws-cdk/aws-cloudfront` | `aws-cdk-lib/aws-cloudfront` |
| `@aws-cdk/aws-route53` | `aws-cdk-lib/aws-route53` |
| `@aws-cdk/aws-route53-targets` | `aws-cdk-lib/aws-route53-targets` |
| `@aws-cdk/aws-s3` | `aws-cdk-lib/aws-s3` |
| `@aws-cdk/aws-s3-deployment` | `aws-cdk-lib/aws-s3-deployment` |
| `@aws-cdk/aws-apigatewayv2` | `aws-cdk-lib/aws-apigatewayv2` |
| `@aws-cdk/aws-apigatewayv2-integrations` | `aws-cdk-lib/aws-apigatewayv2-integrations` |
| `@aws-cdk/aws-dynamodb` | `aws-cdk-lib/aws-dynamodb` |
| `@aws-cdk/aws-lambda` | `aws-cdk-lib/aws-lambda` |
| `@aws-cdk/aws-iam` | `aws-cdk-lib/aws-iam` |
| `@aws-cdk/aws-ssm` | `aws-cdk-lib/aws-ssm` |
| `@aws-cdk/pipelines` | `aws-cdk-lib/pipelines` |
| `@aws-cdk/assert` | `aws-cdk-lib/assertions` |

Additionally, all usages of `cdk.Construct` as a type (in constructor parameters) must change to `Construct` from the `constructs` package:

```ts
// Before
import * as cdk from "@aws-cdk/core";
class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

// After
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
```

## Step 3: Handle deprecated/changed constructs

### `DnsValidatedCertificate` (app-stack.ts)

`acm.DnsValidatedCertificate` is deprecated in CDK v2. Replace with `acm.Certificate` with `validation`:

```ts
// Before
const certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
  domainName: hostname,
  hostedZone: zone,
});

// After
const certificate = new acm.Certificate(this, "Certificate", {
  domainName: hostname,
  validation: acm.CertificateValidation.fromDns(zone),
});
```

### `CloudFrontWebDistribution` (app-stack.ts)

`cloudfront.CloudFrontWebDistribution` still works in CDK v2 but is considered legacy. Optionally migrate to the newer `cloudfront.Distribution` API. This is **not required** for the v2 upgrade but is recommended:

```ts
// Before
const distribution = new cloudfront.CloudFrontWebDistribution(this, "Distribution", {
  defaultRootObject: "lobby.html",
  originConfigs: [{ s3OriginSource: { ... }, behaviors: [{ isDefaultBehavior: true }] }],
  viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(certificate, { aliases: [hostname] }),
});

// After (requires aws-cdk-lib/aws-cloudfront-origins)
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

const distribution = new cloudfront.Distribution(this, "Distribution", {
  defaultRootObject: "lobby.html",
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
  },
  domainNames: [hostname],
  certificate,
});
```

**Decision needed**: migrate CloudFront to the new `Distribution` API now, or keep `CloudFrontWebDistribution` for a smaller diff? Both work in v2. Migrating to `Distribution` will also eliminate the manual `OriginAccessIdentity` in favour of the newer Origin Access Control (OAC) pattern.

### Test assertions (test/ops.test.ts)

The `@aws-cdk/assert` package is replaced by `aws-cdk-lib/assertions` with a different API:

```ts
// Before
import { expect as expectCDK, matchTemplate, MatchStyle } from "@aws-cdk/assert";
expectCDK(stack).to(matchTemplate({}, MatchStyle.EXACT));

// After
import { Template } from "aws-cdk-lib/assertions";
const template = Template.fromStack(stack);
template.templateMatches({});
```

## Step 4: Update `cdk.json`

Remove all v1 feature flags from the `context` block. These are the default behaviour in CDK v2 and are no longer needed:

- `@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId`
- `@aws-cdk/core:enableStackNameDuplicates`
- `aws-cdk:enableDiffNoFail`
- `@aws-cdk/core:newStyleStackSynthesis`
- `@aws-cdk/core:stackRelativeExports`
- `@aws-cdk/aws-ecr-assets:dockerIgnoreSupport`
- `@aws-cdk/aws-secretsmanager:parseOwnedSecretName`
- `@aws-cdk/aws-kms:defaultKeyPolicies`
- `@aws-cdk/aws-s3:grantWriteWithoutAcl`
- `@aws-cdk/aws-ecs-patterns:removeDefaultDesiredCount`
- `@aws-cdk/aws-rds:lowercaseDbIdentifier`
- `@aws-cdk/aws-efs:defaultEncryptionAtRest`
- `@aws-cdk/aws-lambda:recognizeVersionProps`
- `@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021`

The `app` entry can remain as-is (`npx ts-node --prefer-ts-exts bin/ops.ts`).

## Step 5: Install and verify

1. Run `yarn install` to resolve the new dependency tree
2. Run `yarn workspace @battles/ops build` to verify TypeScript compilation
3. Run `yarn workspace @battles/ops test` to verify tests pass
4. Run `yarn workspace @battles/ops cdk synth` to verify CloudFormation output
5. Run `yarn workspace @battles/ops cdk diff` against the deployed stack to confirm no unintended infrastructure changes

## Decisions

1. **CloudFront construct**: Migrate to new `Distribution` API with Origin Access Control (OAC) -- decided yes
2. **`aws-cdk-lib` version pin**: Pin to `^2.248.0` (latest as of 2026-04-12) -- decided yes
