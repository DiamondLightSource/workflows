# SessionSpaces

A Namespace Controller for the virtual cluster performs several critical tasks
to ensure efficient and organized management of namespaces. Specifically, it:

* Creates a cluster-wide role for Argo Workflows and a visit-member.
* Queries the ISPyB database tables, including BLsessions, Proposal, and Persons.
* Creates, deletes, or updates namespaces with the session names derived from
  the ISPyB tables.
* Creates service accounts and role bindings for each namespace.
* Updates the service accounts with the appropriate visit members.

These operations are executed periodically to maintain an up-to-date session
namespaces within the virtual cluster.

## Connect to vcluster and use kubectl inside dev contanier

First download the vcluster binary:

```bash
wget https://github.com/loft-sh/vcluster/releases/download/v0.19.5/\
vcluster-linux-amd64 -O /usr/local/bin/vcluster

chmod +x /usr/local/bin/vcluster
```

Then download and install kubectl

```bash
curl \
  -L -s https://dl.k8s.io/release/stable.txt | \
  xargs -I {} curl -L -o /usr/local/bin/kubectl "https://dl.k8s.io/release/{}/bin/linux/amd64/kubectl"

chmod +x /usr/local/bin/kubectl
```

Download krew to install oidc-login plugin:

```bash
(
  set -x;
  cd "$(mktemp -d)";
  OS="$(uname | tr '[:upper:]' '[:lower:]')";
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')";
  KREW="krew-${OS}_${ARCH}";
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz";
  tar zxvf "${KREW}.tar.gz";
 ./"${KREW}" install krew
)

```

Add krew to the path and install oidc-login:

```bash
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

kubectl krew install oidc-login
```

Before starting the dev container mount the config_argus from
```/home/$USER/.kube/config_argus``` and ```ca.crt``` from ```/dls_sw/apps/kubernetes
/argus/ca.crt``` to ```/root/.kube/config``` and ```/root/.kube/ca.crt```

or copy both the files to the ```.devcontainer``` directory and
append the following to the ```Dockerfile```

```Dockerfile
COPY ./config_argus /root/.kube/config

COPY ./ca.crt /root/.kube/ca.crt
```

Edit the certificate-authority path in ```config_argus``` to ```/root/.kube/ca.crt```

Now you can use connect to the vcluster using ```vcluster connect $VCLUSTER_NAME```
and use kubectl commands inside the vcluster/devcontianer.
