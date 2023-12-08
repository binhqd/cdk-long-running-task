import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
const path = require('path');

import { ParamConfig } from '../../configs/parameters/type';

interface S3TriggerBatchProps extends StackProps {
}

export default class S3TriggerBatchStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, { ...props }: S3TriggerBatchProps) {
    super(scope, id, props);

    const env = this.node.tryGetContext('env');

    let appConfig: ParamConfig = require(`../../configs/parameters/dev-parameters.ts`).default;
    if (['stg', 'prd'].includes(env)) {
      appConfig = require(`../../configs/parameters/${env}-parameters.ts`).default;
    }

    const existingBucket = s3.Bucket.fromBucketName(this, 'ExistingS3Bucket', appConfig.existingS3ForBatch);

    const lambdaName = "FargateTaskLambdaS3TriggerBatchBatch";

    // Create a Lambda execution role
    const lambdaExecutionRole = new iam.Role(this, 'S3LambdaTriggerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Attach the required permissions to the Lambda execution role
    lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "batch:SubmitJob",
        "batch:DescribeJobs",
        "batch:ListJobs"
      ],
      resources: ['*'], // replace with batch queue and batch job ARN
    }));

    // Grant permissions for CloudWatch Logs
    lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${appConfig.region}:${appConfig.accountId}:log-group:/aws/lambda/${lambdaName}*:*`],
    }));

    const jobQueueArn = cdk.Fn.importValue('BatchJobQueueARN');
    const jobDefinitionArn = cdk.Fn.importValue('BatchJobDefinitionARN');

    // Create a Lambda function to execute the Step Functions state machine
    const lambdaTrigger = new lambda.Function(this, lambdaName, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      // environment
      environment: {
        JOB_QUEUE: jobQueueArn,
        JOB_DEFINITION: jobDefinitionArn,
      },
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      role: lambdaExecutionRole,
    });

    // Configure S3 bucket to trigger EventBridge on object creation
    existingBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(lambdaTrigger));

    // Output the ARN of the created State Machine
    new cdk.CfnOutput(this, 'S3Arn', {
      // value: stateMachine.attrArn,
      value: existingBucket.bucketArn,
      description: 'ARN of S3 which trigger the state machine',
    });

    new cdk.CfnOutput(this, 'LambdaTriggerName', {
      // value: stateMachine.attrArn,
      value: lambdaTrigger.functionName,
      description: 'Name of the lambda trigger',
    });
    new cdk.CfnOutput(this, 'LambdaTriggerARN', {
      // value: stateMachine.attrArn,
      value: lambdaTrigger.functionArn,
      description: 'ARN of the lambda trigger',
    });
  }
}