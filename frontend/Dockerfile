FROM docker.io/library/node:20-bookworm-slim AS build

WORKDIR /app

COPY ./yarn.lock ./package.json .
COPY ./dashboard/package.json ./dashboard/package.json
COPY ./relay-workflows-lib ./relay-workflows-lib
COPY ./workflows-lib ./workflows-lib
RUN yarn install --frozen-lockfile

COPY ./supergraph.graphql ./relay-workflows-lib/supergraph.graphql
RUN yarn run --cwd=relay-workflows-lib relay

COPY ./supergraph.graphql ./dashboard/supergraph.graphql

COPY . .
RUN yarn run --cwd=dashboard build

FROM docker.io/library/nginx:stable-otel as nginx

WORKDIR /app

COPY --from=build /app/dashboard/dist /usr/share/nginx/html
COPY ./container_utils/default.conf.template /etc/nginx/templates/default.conf.template
COPY ./container_utils/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
