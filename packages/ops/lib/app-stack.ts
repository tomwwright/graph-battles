import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

const DEPLOYMENT_ARTIFACT_GAME = "../game/package.zip";
const DEPLOYMENT_ARTIFACT_GAME_V2 = "../gamev2/package.zip";
const DEPLOYMENT_ARTIFACT_LOBBY = "../lobby/package.zip";

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domain = "tomwwright.com";
    const hostname = `battles.${domain}`;

    const bucket = new s3.Bucket(this, "Bucket");

    const zone = route53.HostedZone.fromLookup(this, "LookupHostedZone", {
      domainName: domain,
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: hostname,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    const redirectFunction = new cloudfront.Function(this, "RedirectFunction", {
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var uri = event.request.uri;
          // Redirect site root to the standalone lobby app
          if (uri === '/' || uri === '') {
            return { statusCode: 302, statusDescription: 'Found', headers: { location: { value: '/lobby/' } } };
          }
          // Redirect /v1 root to the legacy v1 lobby page
          if (uri === '/v1' || uri === '/v1/') {
            return { statusCode: 302, statusDescription: 'Found', headers: { location: { value: '/v1/lobby.html' } } };
          }
          // Rewrite directory requests to index.html — S3 (OAC) has no directory index
          if (uri.endsWith('/')) {
            event.request.uri = uri + 'index.html';
          }
          return event.request;
        }
      `),
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        functionAssociations: [
          {
            function: redirectFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      domainNames: [hostname],
      certificate,
    });

    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName: hostname,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
    });

    /*
     * * * * * * * * * * * * * * * * * * *
     * App deployments
     */

    new s3deployment.BucketDeployment(this, "DeployApp", {
      sources: [s3deployment.Source.asset(DEPLOYMENT_ARTIFACT_GAME)],
      destinationBucket: bucket,
      destinationKeyPrefix: "v1/",
      distribution,
    });

    new s3deployment.BucketDeployment(this, "DeployGameV2", {
      sources: [s3deployment.Source.asset(DEPLOYMENT_ARTIFACT_GAME_V2)],
      destinationBucket: bucket,
      destinationKeyPrefix: "v2/",
      distribution,
    })

    new s3deployment.BucketDeployment(this, "DeployLobby", {
      sources: [s3deployment.Source.asset(DEPLOYMENT_ARTIFACT_LOBBY)],
      destinationBucket: bucket,
      destinationKeyPrefix: "lobby/",
      distribution,
    })
  }
}
