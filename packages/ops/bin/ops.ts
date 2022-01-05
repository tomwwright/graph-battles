#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";

import { ApiStack } from "../lib/api-stack";
import { AppStack } from "../lib/app-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const TOMWWRIGHT = "933397847440";

const env = {
  account: TOMWWRIGHT,
};

const app = new cdk.App();

export class ApplicationStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new ApiStack(this, "Api", {
      env: {
        ...props?.env,
        region: "ap-southeast-2",
      },
    });

    new AppStack(this, "App", {
      env: {
        ...props?.env,
        region: "us-east-1",
      },
    });
  }
}

const pipelineStack = new PipelineStack(app, "Pipeline", {
  env: {
    ...env,
    region: "ap-southeast-2",
  },
});
pipelineStack.pipeline.addStage(new ApplicationStage(app, "Dev", { env }));
