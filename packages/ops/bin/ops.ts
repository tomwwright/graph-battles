#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { ApiStack } from "../lib/api-stack";
import { AppStack } from "../lib/app-stack";

const TOMWWRIGHT = "933397847440";

const env = {
  account: TOMWWRIGHT,
};

const app = new cdk.App();
new ApiStack(app, "OpsStack", {
  env: {
    ...env,
    region: "ap-southeast-2",
  },
});
new AppStack(app, "App", {
  env: {
    ...env,
    region: "us-east-1",
  },
});
