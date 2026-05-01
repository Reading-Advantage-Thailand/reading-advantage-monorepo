FROM node:18-alpine AS base

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app/

RUN npm install
RUN npm run build --legacy-peer-deps

CMD ["npm", "start"]