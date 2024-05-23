FROM docker.io/library/rust:1.77.2-bullseye AS build

ARG DATABASE_URL

WORKDIR /app

COPY Cargo.toml Cargo.lock .
COPY sessionspaces/Cargo.toml sessionspaces/Cargo.toml

RUN mkdir sessionspaces/src \
    && echo "fn main() {}" > sessionspaces/src/main.rs \
    && cargo build --release

COPY . /app

RUN touch sessionspaces/src/main.rs \
    && cargo build --release

FROM gcr.io/distroless/cc AS deploy

COPY --from=build /app/target/release/sessionspaces /sessionspaces

ENTRYPOINT ["/sessionspaces"]
