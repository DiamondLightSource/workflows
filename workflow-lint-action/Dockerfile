FROM rust:1.87-bullseye AS build
RUN apt update && apt install curl gzip -y \
    && rm -rf /var/lib/apt/lists/*

RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /app
COPY container_utils/ .

RUN ./install-argo.sh
RUN ./install-helm.sh

COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM scratch AS runtime
WORKDIR /

ENV KUBECONFIG="/kubeconfig.yaml"
COPY container_utils/dummy_kubeconfig.yaml .

COPY --from=build /app/argo /bin/
COPY --from=build /app/helm /bin/

COPY --from=build /app/target/x86_64-unknown-linux-musl/release/workflows-linter .


ENTRYPOINT ["/workflows-linter"]
CMD ["lint"]
