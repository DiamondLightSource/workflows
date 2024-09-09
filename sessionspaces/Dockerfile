FROM docker.io/library/rust:1.81.0-bullseye AS build

ARG DATABASE_URL

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release

COPY . .

RUN touch src/main.rs \
    && cargo build --release

FROM gcr.io/distroless/cc-debian12@sha256:b6e1e913f633495eeb80a41e03de1a41aa863e9b19902309b180ffdc4b99db2c AS deploy

COPY --from=build /app/target/release/sessionspaces /sessionspaces

ENTRYPOINT ["/sessionspaces"]
