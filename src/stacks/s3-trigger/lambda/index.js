exports.handler = async (event) => {
  // Read state machine ARN from env
  const stateMachineArn = process.env.STATE_MACHINE_ARN;

  // Invoke the Step Functions state machine
  const stepFunctions = new (require("aws-sdk/clients/stepfunctions"))();
  await stepFunctions
    .startExecution({
      stateMachineArn,
      input: JSON.stringify(event),
    })
    .promise();
};
