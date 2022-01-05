import * as cdk from "@aws-cdk/core";
import * as pipelines from "@aws-cdk/pipelines";
import * as ssm from "@aws-cdk/aws-ssm";

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const connectionArnParameter = ssm.StringParameter.fromStringParameterName(
      this,
      "Parameter",
      "codestar-connection-arn"
    );

    const source = pipelines.CodePipelineSource.connection("tomwwright/graph-battles", "master", {
      connectionArn: connectionArnParameter.stringValue,
    });

    this.pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: source,
        commands: ["yarn build", "yarn workspace @battles/models test", "yarn workspace @battles/api test"],
        primaryOutputDirectory: "packages/ops/cdk.out",
      }),
    });
  }
}
