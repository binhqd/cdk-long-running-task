#!/bin/bash

a=`aws sts get-session-token --serial-number ${AWS_MFA_ARN} --token-code $1`

unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

export AWS_ACCESS_KEY_ID=`echo $a | jq -r .Credentials.AccessKeyId`
export AWS_SECRET_ACCESS_KEY=`echo $a | jq -r .Credentials.SecretAccessKey`
export AWS_SESSION_TOKEN=`echo $a | jq -r .Credentials.SessionToken`
