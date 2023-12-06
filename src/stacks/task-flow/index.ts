import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';

import {
  IVpc
} from "aws-cdk-lib/aws-ec2";
import { ParamConfig } from '../../configs/parameters/type';
import FargateTaskService from './fargate-tasks';

interface TaskFlowProps extends StackProps {
  cluster: cdk.aws_ecs.Cluster;
  // taskDefinition: cdk.aws_ecs.FargateTaskDefinition;
  vpc: IVpc;
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

export default class TaskFlowService extends cdk.Stack {
  constructor(scope: cdk.App, id: string, { ...props }: TaskFlowProps) {
    super(scope, id, props);

    const env = this.node.tryGetContext('env');

    let appConfig: ParamConfig = require(`../../configs/parameters/dev-parameters.ts`).default;
    if (['stg', 'prd'].includes(env)) {
      appConfig = require(`../../configs/parameters/${env}-parameters.ts`).default;
    }

    // Create an SNS Topic for "Notify on Start"
    const notifyOnStartTopic = new sns.Topic(this, 'NotifyOnStartTopic', {
      displayName: 'Notify on Start Topic',
    });

    // Create an SNS Topic for "Notify on Failure"
    const notifyOnFailureTopic = new sns.Topic(this, 'NotifyOnFailureTopic', {
      displayName: 'Notify on Failure Topic',
    });

    // Create an SNS Topic for "Notify on Sucess"
    const notifyOnSuccessTopic = new sns.Topic(this, 'NotifyOnSuccessTopic', {
      displayName: 'Notify on Success Topic',
    });

    // Define IAM role for Step Functions
    const stepFunctionRole = new iam.Role(this, 'StepFunctionRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    // Attach permissions to the IAM role to publish to SNS Topic
    stepFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sns:Publish'],
        resources: [notifyOnStartTopic.topicArn, notifyOnFailureTopic.topicArn, notifyOnSuccessTopic.topicArn],
      })
    );

    // stepFunctionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSStepFunctionsFullAccess'));
    stepFunctionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'));


    // Add more permissions for other services if needed, e.g., ECS
    stepFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RunTask', 'ecs:DescribeTasks', 'ecs:StopTask'],
        resources: ['*'],
      })
    );

    // Add more permissions for other services if needed, e.g., ECS
    stepFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'states:StartExecution',
          'states:ListExecutions',
          'states:DescribeExecution',
          'states:StopExecution',
        ],
        resources: ['*'],
      })
    );

    // Obtain subnet IDs for all subnets in the existing VPC
    const subnetIds: string[] = [];
    for (const az of props.vpc.availabilityZones) {
      const subnet = props.vpc.selectSubnets({ availabilityZones: [az] });
      subnetIds.push(...subnet.subnetIds);
    }

    const newSubnets: cdk.aws_ec2.ISubnet[] = [];

    // Loop through existing subnet IDs and create CDK subnet constructs
    for (const subnetId of subnetIds) {
      const existingSubnet = cdk.aws_ec2.Subnet.fromSubnetAttributes(this, `ExistingSubnet_${subnetId}`, {
        subnetId: subnetId,
        availabilityZone: props.vpc.availabilityZones[0], // Replace with the availability zone of your subnet
        // vpcId: props.vpc.vpcId,
      });

      // Add the new subnet construct to the array
      newSubnets.push(existingSubnet);
    }

    // Create a security group allowing all outbound traffic
    const securityGroup = new ec2.SecurityGroup(this, 'WorkerSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    const fargateTaskStack = new FargateTaskService(this, 'WorkerFargateTaskService', {
      cluster: props.cluster,
      vpc: props.vpc
    });

    // Define your Step Functions state machine definition in JSON
    const stateMachineDefinition = {
      "Comment": "An example of the Amazon States Language for notification on an AWS Fargate task completion",
      "StartAt": "Notify on Start",
      // "TimeoutSeconds": 30,
      "States": {
        "Notify on Start": {
          "Type": "Task",
          "Resource": "arn:aws:states:::sns:publish",
          "Parameters": {
            "Message": "AWS Fargate Task has started",
            "TopicArn": notifyOnStartTopic.topicArn
          },
          "Next": "Run Fargate Task"
        },
        "Run Fargate Task": {
          "Type": "Task",
          "Resource": "arn:aws:states:::ecs:runTask.waitForTaskToken",
          "Parameters": {
            "LaunchType": "FARGATE",
            "Cluster": props.cluster.clusterArn,
            "TaskDefinition": fargateTaskStack.taskDefinition.taskDefinitionArn,
            "Overrides": {
              "ContainerOverrides": [
                {
                  "Name": "worker",
                  "Environment": [
                    {
                      "Name": "TASK_TOKEN_ENV_VARIABLE",
                      "Value.$": "$$.Task.Token"
                    }
                  ]
                }
              ]
            },
            "NetworkConfiguration": {
              "AwsvpcConfiguration": {
                "Subnets": subnetIds,
                "AssignPublicIp": "ENABLED",
                "SecurityGroups": [
                  securityGroup.securityGroupId
                ]
              }
            }
          },
          "Next": "Notify Success",
          "Catch": [
            {
              "ErrorEquals": [
                "States.ALL"
              ],
              "Next": "Notify Failure"
            }
          ]
        },
        "Notify Success": {
          "Type": "Task",
          "Resource": "arn:aws:states:::sns:publish",
          "Parameters": {
            "Message": "AWS Fargate Task started by Step Functions succeeded",
            "TopicArn": notifyOnSuccessTopic.topicArn
          },
          "End": true
        },
        "Notify Failure": {
          "Type": "Task",
          "Resource": "arn:aws:states:::sns:publish",
          "Parameters": {
            "Message": "AWS Fargate Task started by Step Functions failed",
            "TopicArn": notifyOnFailureTopic.topicArn
          },
          "End": true
        }
      }
    }

    // Create a State Machine using CfnStateMachine
    const stateMachineName = 'FargateTaskWithStepFunction';
    const stateMachine = new stepfunctions.CfnStateMachine(this, stateMachineName, {
      definitionString: JSON.stringify(stateMachineDefinition),
      roleArn: stepFunctionRole.roleArn
    });

    // Output the ARN of the created State Machine
    new cdk.CfnOutput(this, 'StateMachineArn', {
      // value: stateMachine.attrArn,
      value: stateMachine.attrArn,
      description: 'ARN of the AWS Step Functions State Machine',
      exportName: 'StateMachineArn'
    });

    new cdk.CfnOutput(this, 'StateMachineName', {
      // value: stateMachine.attrArn,
      value: stateMachineName,
      description: 'Name of AWS Step Functions State Machine',
      exportName: 'StateMachineName'
    });
  }
}