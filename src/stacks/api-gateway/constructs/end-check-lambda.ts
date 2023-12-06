import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
const path = require('path');

interface LambdaEndCheckProps extends StackProps {
  stateMachineArn: string;
  stateMachineName: string;
  lambdaName: string;
}

export default class LambdaEndCheck extends Construct {
  public readonly lambda: cdk.aws_lambda.Function;
  constructor(parent: cdk.Stack, name: string, props: LambdaEndCheckProps) {
    super(parent, name);

    const lambdaEndCheckExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Attach the required permissions to the Lambda execution role
    lambdaEndCheckExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['states:DescribeExecution'],
      resources: [
        `arn:aws:states:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:execution:${props.stateMachineName}*:*`
      ],
    }));

    // Grant permissions for CloudWatch Logs
    lambdaEndCheckExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/${props.lambdaName}*:*`],
    }));

    // Create a Lambda function to execute the Step Functions state machine
    this.lambda = new lambda.Function(this, props.lambdaName, {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'check-status.handler',
      // environment
      environment: {
        STATE_MACHINE_ARN: props.stateMachineArn
      },
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      role: lambdaEndCheckExecutionRole,
    });

    new cdk.CfnOutput(this, 'ApiGatewayLambdaEndCheckName', {
      // value: stateMachine.attrArn,
      value: this.lambda.functionName,
      description: 'Name of the lambda end check',
    });
    new cdk.CfnOutput(this, 'LambdaEndCheckARN', {
      // value: stateMachine.attrArn,
      value: this.lambda.functionArn,
      description: 'ARN of the lambda end check',
    });
  }
}