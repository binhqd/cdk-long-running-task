import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
// import { KeyPair } from 'cdk-ec2-key-pair';
import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface VPCProps extends StackProps {
  vpcId: string;
  availabilityZones: string[];
  publicSubnetIds: string[];
}

export class ExistingVPCStack extends cdk.Stack {
  private _vpc: ec2.IVpc;

  get vpcId(): string {
    return this._vpc.vpcId;
  }

  get publicSubnetIds(): string[] {
    return this._vpc.publicSubnets.map(subnet => subnet.subnetId);
  }

  get privateSubnetIds(): string[] {
    return this._vpc.privateSubnets.map(subnet => subnet.subnetId);
  }

  get vpc(): ec2.IVpc {
    return this._vpc;
  }

  constructor(scope: Construct, id: string, {
    ...props
  }: VPCProps) {
    super(scope, id, props);

    // Create new VPC with 2 Subnets
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVPC', {
      vpcId: props.vpcId,
      availabilityZones: props.availabilityZones,
      // vpcSubnets
      publicSubnetIds: props.publicSubnetIds,
    });

    this._vpc = vpc;

    // Create outputs for connecting
    // new cdk.CfnOutput(this, 'VPC ID', { value: vpc.vpcId });
    // new cdk.CfnOutput(this, 'VPC subnet 1', { value: vpc.publicSubnets[0].subnetId });
    // new cdk.CfnOutput(this, 'VPC subnet 2', { value: vpc.publicSubnets[1].subnetId });
  }
}