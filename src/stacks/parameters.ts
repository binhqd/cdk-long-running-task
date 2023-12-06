import * as commonParameters from '../configs/parameters/common-parameters.json';
import * as envParameters from '../env-parameters.json';

export const parameters = {
  ...commonParameters,
  ...envParameters,
};

export enum ENV {
  DEVELOPMENT = 'dev',
  STAGING = 'stg',
  PRODUCTION = 'prd',
}
