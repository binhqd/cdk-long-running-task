const AWS = require("aws-sdk");

exports.handler = async (event) => {
  console.log(event);
  try {
    // Read state machine ARN from environment variable
    const stateMachineArn = process.env.STATE_MACHINE_ARN;

    // Read execution ID from the event input
    const executionArn = event.queryStringParameters.executionArn;

    // Create StepFunctions SDK client
    const stepFunctions = new AWS.StepFunctions();

    // Describe the execution to get its status
    const result = await stepFunctions
      .describeExecution({
        executionArn: `${executionArn}`,
      })
      .promise();

    // Extract the status from the result
    const status = result.status;

    // Return the status
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Status retrieved successfully.",
        status,
      }),
    };
  } catch (error) {
    console.error("Error checking StepFunction status:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error checking StepFunction status.",
        error: error.message,
      }),
    };
  }
};
