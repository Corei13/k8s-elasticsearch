FROM selenium/node-chrome:3.14.0-arsenic

COPY search.js .
COPY package.json .

RUN apt update && apt install curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get install -y nodejs

RUN npm i

CMD node search.js
