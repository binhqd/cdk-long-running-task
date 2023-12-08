const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");

exports.handler = async (event) => {
  // Read state machine ARN from env
  const stateMachineArn = process.env.STATE_MACHINE_ARN;
  const appRegion = process.env.APP_REGION;

  // Initialize the Step Functions client
  const client = new SFNClient({ region: appRegion }); // replace 'your-region' with your AWS region

  // Set up the parameters for the StartExecutionCommand
  const params = {
    stateMachineArn: stateMachineArn,
    input: JSON.stringify(event),
  };

  // Create a command instance and execute it
  const command = new StartExecutionCommand(params);
  try {
    const response = await client.send(command);
    console.log("State machine execution started successfully", response);
  } catch (error) {
    console.error("Error starting state machine execution", error);
    throw error; // Rethrowing the error will mark the Lambda as failed
  }
};
