FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash openmpi-bin openssh-server libnss-wrapper \
    python3 python3-numpy python3-mpi4py \
    && rm -rf /var/lib/apt/lists/*

COPY examples/mpi-workflow/matrix.py                  /opt/mpi/bin/matrix.py
COPY examples/mpi-workflow/sshd_config               /opt/mpi/etc/sshd_config
COPY examples/mpi-workflow/entrypoint.sh             /usr/local/bin/entrypoint.sh

RUN chmod 0755 /opt/mpi/bin/matrix.py /usr/local/bin/entrypoint.sh \
    && chmod 0644 /opt/mpi/etc/sshd_config

WORKDIR /tmp
