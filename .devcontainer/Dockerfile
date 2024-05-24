FROM docker.io/library/rust:1.78.0-bookworm

RUN rustup component add rustfmt clippy

# Download and install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/kubectl

# Download and install Krew
RUN set -x; cd "$(mktemp -d)" && \
    OS="$(uname | tr '[:upper:]' '[:lower:]')" && \
    ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" && \
    KREW="krew-${OS}_${ARCH}" && \
    curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" && \
    tar zxvf "${KREW}.tar.gz" && \
    ./"${KREW}" install krew && \
    mv "${KREW}" /usr/local/bin/krew

# Add krew to the PATH
ENV PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

RUN krew install oidc-login

# Download and install vcluster
RUN wget https://github.com/loft-sh/vcluster/releases/download/v0.19.5/vcluster-linux-amd64 -O /bin/vcluster && \
    chmod +x /bin/vcluster

COPY ./config_argus /root/.kube/config

COPY ./ca.crt /root/ca.crt
