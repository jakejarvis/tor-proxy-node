FROM node:16

# install pm2 globally
RUN npm install pm2 -g

# set up project
ADD . .
RUN yarn install

CMD [ "pm2-runtime", "app.js" ]
