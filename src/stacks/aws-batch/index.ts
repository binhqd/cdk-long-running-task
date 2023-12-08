import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');

import {
  IVpc
} from "aws-cdk-lib/aws-ec2";

interface TaskWithBatchProps extends StackProps {
  cluster: cdk.aws_ecs.Cluster;
  vpc: IVpc;
}

export default class TaskWithBatchService extends cdk.Stack {
  constructor(scope: cdk.App, id: string, { ...props }: TaskWithBatchProps) {
    super(scope, id, props);

    // Create a Batch compute environment using Fargate
    const computeEnvironment = new batch.FargateComputeEnvironment(this, 'FargateTaskComputeEnv', {
      vpc: props.vpc,
      spot: true
    });

    // Create a Batch job queue
    const jobQueue = new batch.JobQueue(this, 'FargateTaskJobQueue', {
      computeEnvironments: [
        {
          computeEnvironment,
          order: 1,
        },
      ],
    });

    // Create a Batch job definition
    // Create an IAM role for the Batch job
    const jobRole = new iam.Role(this, 'BatchJobRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Attach policies to the Batch job role for ECR access
    const ecrAccessPolicy = new iam.Policy(this, 'ECRAccessPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: ['ecr:GetAuthorizationToken', 'ecr:BatchCheckLayerAvailability', 'ecr:BatchGetImage',
            'logs:CreateLogStream'
          ],
          resources: ['*'], // TODO: Replace with your ECR repository ARN if you want to restrict access
        }),
      ],
    });

    jobRole.attachInlinePolicy(ecrAccessPolicy);

    // batch.EcsFargateContainerDefinition
    const containerDefinition = new batch.EcsFargateContainerDefinition(this, 'EcsJobDefinition', {
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, './docker/worker')),
      cpu: 0.25,
      memory: cdk.Size.mebibytes(512),
      jobRole,
      assignPublicIp: true
    });

    // Create a Batch job definition
    const jobDefinition = new batch.EcsJobDefinition(this, 'JobDefinition', {
      container: containerDefinition
    });

    // Output the ARN of the created Job Definition
    new cdk.CfnOutput(this, 'JobDefinitionARN', {
      value: jobDefinition.jobDefinitionArn,
      description: 'ARN of Job Definition',
      exportName: 'BatchJobDefinitionARN'
    });

    new cdk.CfnOutput(this, 'JobQueueARN', {
      value: jobQueue.jobQueueArn,
      description: 'ARN of Job Queue',
      exportName: 'BatchJobQueueARN'
    });
  }
}