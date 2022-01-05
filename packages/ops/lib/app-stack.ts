import * as cdk from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53targets from "@aws-cdk/aws-route53-targets";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deployment from "@aws-cdk/aws-s3-deployment";

const DEPLOYMENT_ARTIFACT = "../game/package.zip";

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domain = "tomwwright.com";
    const hostname = `battles.${domain}`;

    const bucket = new s3.Bucket(this, "Bucket");

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "OIA", {
      comment: "Setup read access from CloudFront to the bucket",
    });
    bucket.grantRead(originAccessIdentity);

    const zone = route53.HostedZone.fromLookup(this, "LookupHostedZone", {
      domainName: domain,
    });

    const certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
      domainName: hostname,
      hostedZone: zone,
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(this, "Distribution", {
      defaultRootObject: "lobby.html",
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: originAccessIdentity,
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
      aliasConfiguration: {
        acmCertRef: certificate.certificateArn,
        names: [hostname],
      },
    });

    new s3deployment.BucketDeployment(this, "DeployApp", {
      sources: [s3deployment.Source.asset(DEPLOYMENT_ARTIFACT)],
      destinationBucket: bucket,
      distribution,
    });

    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName: hostname,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
    });
  }
}
