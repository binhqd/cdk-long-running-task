const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");

const wait = (n) => new Promise((resolve) => setTimeout(resolve, n));

exports.handler = async (event) => {
  const appRegion = process.env.APP_REGION;
  try {
    // Read state machine ARN from environment variable
    const stateMachineArn = process.env.STATE_MACHINE_ARN;

    // Initialize the Step Functions client
    const client = new SFNClient({ region: appRegion }); // replace 'your-region' with your AWS region

    // Uncomment the wait line if needed
    // await wait(30);

    const command = new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(event),
    });

    const execution = await client.send(command);

    // If the execution was successful, respond with a success message and status
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "StepFunction triggered successfully!",
        execution,
        status: "Success",
      }),
    };
  } catch (error) {
    // If an error occurs, respond with an error message and status
    console.error("Error triggering StepFunction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error triggering StepFunction",
        status: "Error",
      }),
    };
  }
};
