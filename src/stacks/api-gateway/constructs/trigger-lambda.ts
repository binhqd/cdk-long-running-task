import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
const path = require('path');

interface LambdaTriggerProps extends StackProps {
  stateMachineArn: string;
  lambdaName: string;
}

export default class LambdaTrigger extends Construct {
  public readonly lambda: cdk.aws_lambda.Function;
  constructor(parent: cdk.Stack, name: string, props: LambdaTriggerProps) {
    super(parent, name);

    const lambdaTriggerExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Attach the required permissions to the Lambda execution role
    lambdaTriggerExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['states:StartExecution'],
      resources: [props.stateMachineArn],
    }));

    // Grant permissions for CloudWatch Logs
    lambdaTriggerExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/${props.lambdaName}*:*`],
    }));

    // Create a Lambda function to execute the Step Functions state machine
    this.lambda = new lambda.Function(this, props.lambdaName, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      // environment
      environment: {
        STATE_MACHINE_ARN: props.stateMachineArn,
        APP_REGION: cdk.Stack.of(this).region
      },
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      role: lambdaTriggerExecutionRole,
    });

    new cdk.CfnOutput(this, 'ApiGatewayLambdaTriggerName', {
      // value: stateMachine.attrArn,
      value: this.lambda.functionName,
      description: 'Name of the lambda trigger',
    });
    new cdk.CfnOutput(this, 'LambdaTriggerARN', {
      // value: stateMachine.attrArn,
      value: this.lambda.functionArn,
      description: 'ARN of the lambda trigger',
    });
  }
}