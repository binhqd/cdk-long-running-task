const { BatchClient, SubmitJobCommand } = require("@aws-sdk/client-batch");

exports.handler = async (event) => {
    const client = new BatchClient({ region: "ap-northeast-1" }); // replace 'your-region' with your AWS region

    // Retrieve job queue and job definition from environment variables
    const jobQueue = process.env.JOB_QUEUE;
    const jobDefinition = process.env.JOB_DEFINITION;
    const jobName = "example-batch-job";

    const params = {
        jobName: jobName,
        jobQueue: jobQueue,
        jobDefinition: jobDefinition,
        // include additional parameters if required
    };

    try {
        const command = new SubmitJobCommand(params);
        const response = await client.send(command);
        console.log("Job submitted successfully", response.jobId);

        return {
            statusCode: 200,
            body: JSON.stringify('Job submitted successfully! Job ID: ' + response.jobId),
        };
    } catch (error) {
        console.error("Error submitting job", error);

        return {
            statusCode: 500,
            body: JSON.stringify('Error submitting job: ' + error),
        };
    }
};
