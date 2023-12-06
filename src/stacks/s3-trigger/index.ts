import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
const path = require('path');

import { ParamConfig } from '../../configs/parameters/type';

interface S3TriggerProps extends StackProps {
}

interface StateMachineDefinition {
  Comment: string;
  StartAt: string;
  TimeoutSeconds: number;
  States: {
    [key: string]: StateDefinition;
  };
}

interface StateDefinition {
  Type: string;
  Resource: string;
  Parameters?: {
    [key: string]: any;
  };
  Next?: string;
  Catch?: {
    ErrorEquals: string[];
    Next: string;
  }[];
  End?: boolean;
}

export default class S3TriggerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, { ...props }: S3TriggerProps) {
    super(scope, id, props);

    const env = this.node.tryGetContext('env');

    let appConfig: ParamConfig = require(`../../configs/parameters/dev-parameters.ts`).default;
    if (['stg', 'prd'].includes(env)) {
      appConfig = require(`../../configs/parameters/${env}-parameters.ts`).default;
    }

    const existingBucket = s3.Bucket.fromBucketName(this, 'ExistingS3Bucket', appConfig.existingS3);

    const stateMachineArn = cdk.Fn.importValue('StateMachineArn');
    const lambdaName = "FargateTaskLambdaS3TriggerStepFunction";

    // Create a Lambda execution role
    const lambdaExecutionRole = new iam.Role(this, 'S3LambdaTriggerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Attach the required permissions to the Lambda execution role
    lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['states:StartExecution'],
      resources: [stateMachineArn],
    }));

    // Grant permissions for CloudWatch Logs
    lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${appConfig.region}:${appConfig.accountId}:log-group:/aws/lambda/${lambdaName}*:*`],
    }));

    // Create a Lambda function to execute the Step Functions state machine
    const lambdaTrigger = new lambda.Function(this, lambdaName, {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      // environment
      environment: {
        STATE_MACHINE_ARN: stateMachineArn
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