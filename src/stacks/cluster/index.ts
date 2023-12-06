// import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import ec2 = require('aws-cdk-lib/aws-ec2');
import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');
import { StackProps } from 'aws-cdk-lib';

interface ECSClusterProps extends StackProps {
  vpc: ec2.Vpc | ec2.IVpc;
  clusterName: string;
}

export class ECSCluster extends cdk.Stack {
  private _cluster: ecs.Cluster;
  private _vpc: ec2.IVpc;

  constructor(scope: cdk.App, id: string, props: ECSClusterProps) {
    super(scope, id, props);

    this._vpc = props.vpc;

    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: props.clusterName,
      vpc: props.vpc
    });

    this._cluster = cluster;
    // const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', { autoScalingGroup: asg });
    // cluster.addAsgCapacityProvider(capacityProvider);

    new cdk.CfnOutput(this, 'Cluster name', { value: cluster.clusterName });
    new cdk.CfnOutput(this, 'Cluster ARN', { value: cluster.clusterArn });
  }

  get cluster(): ecs.Cluster {
    return this._cluster;
  }

  get vpc(): ec2.IVpc {
    return this._vpc;
  }
}