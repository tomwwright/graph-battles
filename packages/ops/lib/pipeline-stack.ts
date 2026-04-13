import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BuildSpec, ComputeType, LinuxArmBuildImage } from "aws-cdk-lib/aws-codebuild";

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const connectionArnParameter = ssm.StringParameter.fromStringParameterName(
      this,
      "Parameter",
      "codestar-connection-arn"
    );

    const source = pipelines.CodePipelineSource.connection("tomwwright/graph-battles", "master", {
      connectionArn: connectionArnParameter.stringValue,
    });

    const rolePolicyStatements: iam.PolicyStatement[] = [
      new iam.PolicyStatement({
        actions: ["route53:ListHostedZonesByName"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      }),
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        effect: iam.Effect.ALLOW,
        resources: [connectionArnParameter.parameterArn],
      }),
    ];

    this.pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: source,
        commands: [
          "yarn install",
          "yarn build",
          "yarn workspace @battles/models test",
          "yarn workspace @battles/api test",
          "yarn workspace @battles/game bundle:client",
          "yarn workspace @battles/game package",
          "yarn workspace @battles/gamev2 build",
          "yarn workspace @battles/gamev2 package",
          "yarn workspace @battles/lobby build",
          "yarn workspace @battles/lobby package",
          "yarn workspace @battles/ops cdk synth",
        ],
        primaryOutputDirectory: "packages/ops/cdk.out",
      }),
      synthCodeBuildDefaults: {
        buildEnvironment: {
          buildImage: LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
          computeType: ComputeType.LARGE,
        },
        partialBuildSpec: BuildSpec.fromObject({
          phases: {
            install: {
              "runtime-versions": {
                "nodejs": "24.x"
              }
            }
          }
        }),
        rolePolicy: rolePolicyStatements,
      },
    });
  }
}
