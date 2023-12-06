import * as cdk from 'aws-cdk-lib';
import { NestedStackProps } from 'aws-cdk-lib';
import {
  IVpc
} from "aws-cdk-lib/aws-ec2";
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ParamConfig } from '../../../configs/parameters/type';
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import path = require('path');

interface FargateTaskProps extends NestedStackProps {
  cluster?: ecs.Cluster;
  vpc: IVpc;
}

export default class FargateTaskService extends cdk.NestedStack {
  public readonly taskDefinition: cdk.aws_ecs.FargateTaskDefinition;
  public readonly workerContainer: cdk.aws_ecs.ContainerDefinition;

  constructor(scope: Construct, id: string, { ...props }: FargateTaskProps) {
    super(scope, id, props);

    const env = this.node.tryGetContext('env');

    let appConfig: ParamConfig = require(`../../../configs/parameters/dev-parameters.ts`).default;
    if (['stg', 'prd'].includes(env)) {
      appConfig = require(`../../../configs/parameters/${env}-parameters.ts`).default;
    }

    let ecsCluster = props.cluster;
    if (!ecsCluster) {
      ecsCluster = new ecs.Cluster(this, 'DefaultEcsCluster', { vpc: props.vpc });
    }

    // Create an IAM role for the Fargate task
    const taskRole = new iam.Role(this, 'WorkerFargateTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "states:SendTaskSuccess",
          "states:SendTaskFailure"
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            "aws:PrincipalAccount": appConfig.accountId
          }
        }
      }),
    );

    this.taskDefinition = new ecs.FargateTaskDefinition(this, "WorkerFargateTask", {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole: taskRole,
    });

    this.workerContainer = this.taskDefinition.addContainer('worker', {
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, './docker/worker')),
      memoryLimitMiB: 256,
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'worker',
      }),
      // essential: true,
    });
  }
}