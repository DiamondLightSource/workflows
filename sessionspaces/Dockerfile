FROM docker.io/library/rust:1.81.0-bullseye AS build

ARG DATABASE_URL

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release

COPY . .

RUN touch src/main.rs \
    && cargo build --release

FROM gcr.io/distroless/cc-debian12@sha256:682ff941956437ab1fc0f6fe969b18ede078839cc4f4fbc156ab546d2a9055fd AS deploy

COPY --from=build /app/target/release/sessionspaces /sessionspaces

ENTRYPOINT ["/sessionspaces"]
