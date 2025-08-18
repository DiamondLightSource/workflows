FROM docker.io/library/rust:1.89.0-bookworm

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x kubectl && mv kubectl /usr/bin/kubectl

RUN rustup component add rustfmt clippy
