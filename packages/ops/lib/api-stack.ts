import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigatewayv2";
import * as apigatewayIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as path from "path";

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
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
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "../../.."), {
        exclude: ["packages/ops"],
      }),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(lambdaFunction);

    const api = new apigateway.HttpApi(this, "Api", {
      defaultIntegration: new apigatewayIntegrations.HttpLambdaIntegration("Integration", lambdaFunction),
    });
  }
}
