# BUILD IMAGE
FROM node:14

WORKDIR /usr/src/app
COPY . .

RUN yarn install --check-files --frozen-lockfile
RUN yarn build
RUN yarn install --check-files --frozen-lockfile --production --force # purge dev-dependencies

# DEPLOY IMAGE
FROM node:14-alpine

COPY --from=0 /usr/src/app /usr/src/app
WORKDIR /usr/src/app

EXPOSE 3000
CMD ["node", "dist/server.js"]