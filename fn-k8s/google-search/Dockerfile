FROM selenium/node-chrome:3.14.0-arsenic

COPY search.js .
COPY package.json .

RUN wget -q -O- https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN sudo apt-get install -y nodejs
RUN sudo npm install

CMD node search.js
