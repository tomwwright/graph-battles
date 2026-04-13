import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as assets from "aws-cdk-lib/aws-ecr-assets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "Table", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const lambdaFunction = new lambda.DockerImageFunction(this, "Function", {
      architecture: lambda.Architecture.ARM_64,
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "../../.."), {
        exclude: ["packages/ops"],
        platform: assets.Platform.LINUX_ARM64,
      }),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(lambdaFunction);

    const api = new apigateway.HttpApi(this, "Api", {
      defaultIntegration: new apigatewayIntegrations.HttpLambdaIntegration("Integration", lambdaFunction),
      corsPreflight: {
        allowOrigins: [
          "https://battles.tomwwright.com",
          "http://localhost:5173" // vite dev server
        ]
      }
    });
  }
}
