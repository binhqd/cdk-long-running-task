import { ParamConfig } from "./type";

const region = 'ap-northeast-1';
const config: ParamConfig = {
  vpcId: '',
  region,
  accountId: '',
  efsId: '',
  efsEndpointId: '',
  efsAccessPointId: '',
  availabilityZones: [`${region}c`, `${region}a`],
  publicSubnetIds: [],
  existingS3: '',
  existingS3ForBatch: ''
}

export default config;