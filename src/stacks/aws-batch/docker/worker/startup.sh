#!/bin/bash

echo 'Hello World'
echo $TASK_TOKEN_ENV_VARIABLE
aws stepfunctions send-task-success  --task-output '{"orderId":1}' --task-token $TASK_TOKEN_ENV_VARIABLE