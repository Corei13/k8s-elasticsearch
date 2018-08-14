FROM node:10-alpine

COPY subscriber.js .
COPY package.json .
RUN npm install

CMD node subscriber.js
