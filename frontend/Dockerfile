FROM docker.io/library/node:24-bookworm-slim AS build

WORKDIR /app

COPY ./yarn.lock ./package.json .
COPY ./dashboard/package.json ./dashboard/package.json
COPY ./relay-workflows-lib ./relay-workflows-lib
COPY ./workflows-lib ./workflows-lib
RUN yarn install --frozen-lockfile

COPY . .
COPY ./supergraph.graphql ./relay-workflows-lib/supergraph.graphql
RUN yarn run --cwd=relay-workflows-lib relay

COPY ./supergraph.graphql ./dashboard/supergraph.graphql
RUN yarn run --cwd=dashboard build

FROM docker.io/library/nginx:1.29.2-alpine-slim as nginx

WORKDIR /app

COPY ./configure.sh .
COPY --from=build /app/dashboard/dist /usr/share/nginx/html
COPY ./container_utils/default.conf.template /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["sh"]
CMD ["/app/configure.sh"]
