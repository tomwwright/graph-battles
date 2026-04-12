import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as Ops from '../lib/api-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Ops.ApiStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    Resources: {},
  });
});
