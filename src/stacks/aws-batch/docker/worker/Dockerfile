FROM --platform=linux/amd64 python:3.12.0-alpine3.18

RUN apk add --no-cache bash
RUN pip install boto3
RUN pip --no-cache-dir install --upgrade awscli

ADD startup.sh /opt/startup.sh
RUN sed -i 's/\r//g' /opt/startup.sh

CMD ["/bin/bash", "/opt/startup.sh"]
