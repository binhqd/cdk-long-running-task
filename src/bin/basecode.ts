#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { ParamConfig } from '../configs/parameters/type';
import ApiGatewayTriggerStack from '../stacks/api-gateway';
import { ECSCluster } from '../stacks/cluster';
import S3TriggerStack from '../stacks/s3-trigger';
import TaskFlowService from '../stacks/task-flow';
import { ExistingVPCStack } from '../stacks/vpc/existingVPC';

const app = new cdk.App();

const env = app.node.tryGetContext('env');

let appConfig: ParamConfig = require(`../configs/parameters/dev-parameters.ts`).default
if (['stg', 'prd'].includes(env)) {
  appConfig = require(`../configs/parameters/${env}-parameters.ts`).default;
}

const vpcStack = new ExistingVPCStack(app, 'ExistingVPC', {
  vpcId: appConfig.vpcId,
  availabilityZones: appConfig.availabilityZones,
  publicSubnetIds: appConfig.publicSubnetIds
});

// Create new cluster
const clusterStack = new ECSCluster(app, 'FargateTaskCluster', {
  vpc: vpcStack.vpc,
  clusterName: 'fargate-task-example-cluster',
});
clusterStack.addDependency(vpcStack);

const stateMachine = new TaskFlowService(app, 'StateMachineStack', {
  vpc: vpcStack.vpc,
  cluster: clusterStack.cluster
});
stateMachine.addDependency(vpcStack)
stateMachine.addDependency(clusterStack)

const s3TriggerStack = new S3TriggerStack(app, 'S3TriggerStack', {});
s3TriggerStack.addDependency(stateMachine)

const apiGatewayTriggerStack = new ApiGatewayTriggerStack(app, 'ApiGatewayTriggerStack', {
  env: {
    region: appConfig.region,
    account: appConfig.accountId,
  },
});
apiGatewayTriggerStack.addDependency(stateMachine)