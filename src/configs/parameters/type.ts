export type ParamConfig = {
  vpcId: string;
  region: string;
  accountId: string;
  efsId: string;
  efsEndpointId: string;
  efsAccessPointId: string;
  availabilityZones: string[];
  publicSubnetIds: string[];
  existingS3: string;
}