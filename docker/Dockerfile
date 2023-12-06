FROM node:18.3

WORKDIR /app

RUN apt-get update -y && apt-get install -y python3-pip jq && pip3 install awscli
RUN npm install -g npm@8.3.0
RUN npm install -g aws-cdk@2.100.0
