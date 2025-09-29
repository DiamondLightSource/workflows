# Local Dev Env

This is a local env designed to speed up development of sessionspaces by providing the
necessary infrastucture needed to run things.

## Components

Sessionspaces - The bulk of the code.
ISPYB - A dev mock of the production ISPYB database, providing a handful of sesions to test with.
KIND - A lightweight kubernetes-in-docker distro. This give sessionspaces a transient cluster to interact with.
Kubectl - CLI to interact with the cluster. Convenient to validate what sessionspaces has created.
Docker - Docker CLI requierd to do docker-in-docker interactions with the cluster.


## Getting Started

1) If using podman, enable the podman socket so you're able to mount it. Depending on you podman setup the socket may be in `/var/run/docker.sock`, or `/run/user/<UID>/podman/podman.sock`. Docker should already have a socket. Find and correct the volume mount in the docker-compose.yml

```bash
systemctl --user enable --now podman.socket
```

2) Proxy the LDAP. The LDAP is only accessible from workstations, the local cluster is usable on a root laptop. We get around this by proxying the LDAP traffic via a workstation. Something like this should work, with your own workstation as the ssh host.

```bash 
ssh -L 1389:ldapmaster.diamond.ac.uk:389 USER@WORKSTATION
```

3) Enter the dev container

4) Create a new kind cluster. If any already exist, delete it.

```bash
kind create cluster
```

5) Run sessionspaces

```bash
cargo run
```


## Usage

The kind cluster can be deleted and re-created on demand when a clean-slate is desired.

View the created namespaces/configmaps with 'kubectl' (pre-installed in the dev dockerfile)