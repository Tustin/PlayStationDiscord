FROM node:10.16.2-slim

RUN apt-get update \
 && apt-get --no-install-recommends -y install python-minimal python-dev make g++ libglib2.0-0 libnss3 libgtk-3-0 libxtst6 libxss1 libasound2 bzip2 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/scr/app
COPY . /usr/scr/app

RUN npm config set scripts-prepend-node-path true
RUN yarn install --pure-lockfile

CMD yarn start
