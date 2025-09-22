FROM docker.io/library/rust:1.89.0-bookworm

RUN rustup component add rustfmt clippy

WORKDIR /app
RUN curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.30.0/kind-linux-amd64
RUN chmod +x ./kind && mv ./kind /usr/local/bin/kind

RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-28.4.0.tgz \
    | tar xz -C /usr/local/bin --strip-components=1 docker/docker

RUN curl -LO "https://dl.k8s.io/release/v1.34.1/bin/linux/amd64/kubectl" && \
        install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
