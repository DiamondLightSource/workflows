FROM docker.io/library/rust:1.80.1-bullseye AS build

ARG ARGO_SERVER_SCHEMA_URL

WORKDIR /app

RUN rustup component add rustfmt

COPY argo-workflows-openapi argo-workflows-openapi
COPY Cargo.toml Cargo.lock ./

RUN mkdir src \
    && echo "fn main() {}" > src/main.rs \
    && cargo build --release

COPY . .

RUN touch src/main.rs \
    && cargo build --release

FROM gcr.io/distroless/cc-debian12@sha256:3b75fdd33932d16e53a461277becf57c4f815c6cee5f6bc8f52457c095e004c8 AS deploy

COPY --from=build /app/target/release/graph-proxy /graph-proxy

ENTRYPOINT ["/graph-proxy"]
