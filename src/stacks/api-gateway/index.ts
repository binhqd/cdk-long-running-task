import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
const path = require('path');

import LambdaEndCheck from './constructs/end-check-lambda';
import LambdaTrigger from './constructs/trigger-lambda';

interface ApiGatewayTriggerProps extends StackProps {
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

export default class ApiGatewayTriggerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, { ...props }: ApiGatewayTriggerProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, 'APIGatewayTriggerStepFunction');

    // API Endpoint 1: Trigger StepFunction using Lambda
    const triggerEndpoint = api.root.addResource('trigger');

    const stateMachineArn = cdk.Fn.importValue('StateMachineArn');
    const stateMachineName = cdk.Fn.importValue('StateMachineName');
    const lambdaTrigger = new LambdaTrigger(this, "LambdaTriggerConstruct", {
      stateMachineArn,
      lambdaName: "LambdaTriggerStepFunction"
    });

    triggerEndpoint.addMethod('POST', new apigateway.LambdaIntegration(lambdaTrigger.lambda), {
      apiKeyRequired: true
    });

    // API Endpoint 2: Check status of StepFunction
    const endCheckEndpoint = api.root.addResource('end-check');
    const lambdaEndCheck = new LambdaEndCheck(this, "LambdaEndCheckConstruct", {
      stateMachineName,
      lambdaName: "LambdaEndCheckStepFunction"
    });
    endCheckEndpoint.addMethod('GET', new apigateway.LambdaIntegration(lambdaEndCheck.lambda), {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.querystring.executionArn': true,
      },
    });

    // ----------- Setup API Key --------------
    // Create an API key for the "triggerStepFunction" API key
    const apiKey = new apigateway.ApiKey(this, 'TriggerStepFunctionApiKey', {
      apiKeyName: 'triggerStepFunction',
    });

    // Create a Usage Plan
    const usagePlan = api.addUsagePlan('MyBasicTriggerPlan', {
      name: "MyBasicTriggerPlan",
      throttle: {
        rateLimit: 500, // Adjust as needed
        burstLimit: 100, // Adjust as needed
      },
    });

    // Add the API key to the usage plan
    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // // API Endpoint 2: Check current status of StepFunction
    // const statusEndpoint = api.root.addResource('status');
    // statusEndpoint.addMethod('GET', new apigateway.LambdaIntegration(lambdaTrigger)); // You might need to implement logic to check the status

    // API Endpoint 3: Check if StepFunction has ended

    // const endCheckEndpoint = api.root.addResource('end-check');
    // endCheckEndpoint.addMethod('GET', new apigateway.LambdaIntegration(lambdaTrigger), {
    //   apiKeyRequired: true
    // }); // You might need to implement logic to check if the StepFunction has ended

  }
}