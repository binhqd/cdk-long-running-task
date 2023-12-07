const AWS = require("aws-sdk");

const wait = (n) => new Promise((resolve) => setTimeout(resolve, n));

exports.handler = async (event) => {
  try {
    // Read state machine ARN from environment variable
    const stateMachineArn = process.env.STATE_MACHINE_ARN;

    // Create StepFunctions SDK client
    const stepFunctions = new AWS.StepFunctions();

    await wait(30);

    const execution = await stepFunctions
      .startExecution({
        stateMachineArn,
        input: JSON.stringify(event),
      })
      .promise();

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
