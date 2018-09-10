# base image
FROM node:10.10.0-alpine

ENV NODE_ENV production

# set working directory
RUN mkdir /app
WORKDIR /app

COPY yarn.lock /app
COPY package.json /app

COPY . /app
RUN yarn install

EXPOSE 7777

CMD ["yarn", "start"]