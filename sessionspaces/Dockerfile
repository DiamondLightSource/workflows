FROM docker.io/library/rust:1.77.2-bullseye AS build

ARG DATABASE_URL

WORKDIR /app

COPY . .

RUN cargo build --release

FROM gcr.io/distroless/cc AS deploy

COPY --from=build /app/target/release/sessionspaces /sessionspaces

ENTRYPOINT ["/sessionspaces"]
