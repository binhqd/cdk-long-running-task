const {
  SFNClient,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
} = require("@aws-sdk/client-sfn");

exports.handler = async (event) => {
  const appRegion = process.env.APP_REGION;

  try {
    // Read execution ID from the event input
    const executionArn = event.queryStringParameters
      ? event.queryStringParameters.executionArn
      : null;

    // Check if executionArn is provided
    if (!executionArn) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Missing executionArn query parameter",
        }),
      };
    }

    // Initialize the Step Functions client
    const client = new SFNClient({ region: appRegion }); // replace 'your-region' with your AWS region

    // Describe the execution to get its status
    const describeCommand = new DescribeExecutionCommand({ executionArn });
    const result = await client.send(describeCommand);

    // Extract the status from the result
    const status = result.status;

    if (status === "SUCCEEDED") {
      // Retrieve the execution history
      const historyCommand = new GetExecutionHistoryCommand({
        executionArn,
        reverseOrder: true,
      });
      const data = await client.send(historyCommand);

      // Find the success event to get the output
      const successEvent = data.events.find(
        (event) => event.type === "ExecutionSucceeded"
      );

      if (successEvent && successEvent.executionSucceededEventDetails) {
        const output = successEvent.executionSucceededEventDetails.output;
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Execution Output",
            status,
            output: JSON.parse(output),
          }),
        };
      } else {
        // No success event found
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "No success event found or no output available",
            status,
          }),
        };
      }
    } else {
      // Return the status
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Status retrieved successfully.",
          status,
        }),
      };
    }
  } catch (error) {
    console.error("Error checking StepFunction status:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Error checking StepFunction status.",
        error: error.message,
      }),
    };
  }
};
