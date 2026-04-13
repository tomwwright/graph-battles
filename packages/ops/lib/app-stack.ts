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

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "lobby.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
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
      distribution,
      exclude: [
        "v2/*",
        "lobby/*"
      ]
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
