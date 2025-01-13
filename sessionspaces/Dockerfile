FROM docker.io/library/rust:1.84.0-bullseye AS build

ARG DATABASE_URL

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs \
  && touch --date @0 src/main.rs \
  && cargo build --release

COPY . .

RUN touch src/main.rs \
  && cargo build --release

FROM gcr.io/distroless/cc-debian12@sha256:b7550f0b15838de14c564337eef2b804ba593ae55d81ca855421bd52f19bb480 AS deploy

COPY --from=build /app/target/release/sessionspaces /sessionspaces

ENTRYPOINT ["/sessionspaces"]
