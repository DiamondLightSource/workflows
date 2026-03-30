#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CLUSTER_NAME=${CLUSTER_NAME:-workflows-local}
MINIKUBE_PROFILE=${MINIKUBE_PROFILE:-$CLUSTER_NAME}
MINIKUBE_CPUS=${MINIKUBE_CPUS:-4}
MINIKUBE_MEMORY=${MINIKUBE_MEMORY:-8192}
KUBE_CONTEXT=${WORKFLOWS_LOCAL_KUBE_CONTEXT:-}
UID_VALUE=${WORKFLOWS_LOCAL_UID:-$(id -u)}
WORKFLOWS_LOCAL_BUILD_IMAGES=${WORKFLOWS_LOCAL_BUILD_IMAGES:-auto}
WORKFLOWS_LOCAL_REBUILD_IMAGES=${WORKFLOWS_LOCAL_REBUILD_IMAGES:-false}
WORKFLOWS_LOCAL_INSTALL_DASHBOARD=${WORKFLOWS_LOCAL_INSTALL_DASHBOARD:-auto}
WORKFLOWS_LOCAL_INSTALL_STARTER_TEMPLATES=${WORKFLOWS_LOCAL_INSTALL_STARTER_TEMPLATES:-true}
ARGO_SERVER_SCHEMA_URL=${ARGO_SERVER_SCHEMA_URL:-https://raw.githubusercontent.com/argoproj/argo-workflows/v3.7.0/api/openapi-spec/swagger.json}
GRAPH_PROXY_LOCAL_REPOSITORY=${GRAPH_PROXY_LOCAL_REPOSITORY:-workflows-graph-proxy-local}
GRAPH_PROXY_LOCAL_TAG=${GRAPH_PROXY_LOCAL_TAG:-0.1.17-local}
DASHBOARD_LOCAL_REPOSITORY=${DASHBOARD_LOCAL_REPOSITORY:-workflows-dashboard-local}
DASHBOARD_LOCAL_TAG=${DASHBOARD_LOCAL_TAG:-0.1.12-local}
NODE_ARCH=""
USE_LOCAL_GRAPH_PROXY_IMAGE=false
USE_LOCAL_DASHBOARD_IMAGE=false
INSTALL_DASHBOARD=true

if [ "$WORKFLOWS_LOCAL_REBUILD_IMAGES" = "true" ]; then
  rebuild_suffix=$(date +%s)
  GRAPH_PROXY_LOCAL_TAG="${GRAPH_PROXY_LOCAL_TAG}-${rebuild_suffix}"
  DASHBOARD_LOCAL_TAG="${DASHBOARD_LOCAL_TAG}-${rebuild_suffix}"
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

require_cmd helm
require_cmd kubectl

require_cluster() {
  if [ -n "$KUBE_CONTEXT" ]; then
    return
  fi

  if command -v kind >/dev/null 2>&1; then
    if ! kind get clusters | grep -qx "$CLUSTER_NAME"; then
      kind create cluster --name "$CLUSTER_NAME"
    fi
    KUBE_CONTEXT="kind-$CLUSTER_NAME"
    return
  fi

  if command -v minikube >/dev/null 2>&1; then
    host_status=$(minikube -p "$MINIKUBE_PROFILE" status --format '{{.Host}}' 2>/dev/null || true)
    if [ "$host_status" != "Running" ]; then
      minikube -p "$MINIKUBE_PROFILE" start \
        --cpus="$MINIKUBE_CPUS" \
        --memory="$MINIKUBE_MEMORY"
    fi
    KUBE_CONTEXT="$MINIKUBE_PROFILE"
    return
  fi

  echo "Unable to find a local Kubernetes backend." >&2
  echo "Install kind, install minikube, or set WORKFLOWS_LOCAL_KUBE_CONTEXT." >&2
  exit 1
}

helm_ctx() {
  helm --kube-context "$KUBE_CONTEXT" "$@"
}

kubectl_ctx() {
  kubectl --context "$KUBE_CONTEXT" "$@"
}

adopt_static_sessionspaces() {
  namespaces=$(list_static_sessionspaces)
  [ -n "$namespaces" ] || return

  for namespace in $namespaces; do
    kubectl_ctx label namespace "$namespace" app.kubernetes.io/managed-by- >/dev/null 2>&1 || true
    kubectl_ctx -n "$namespace" label configmap sessionspaces app.kubernetes.io/managed-by- >/dev/null 2>&1 || true
  done
}

list_static_sessionspaces() {
  kubectl_ctx get namespaces \
    -l workflows.diamond.ac.uk/static-sessionspace=true \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
}

sync_static_sessionspaces() {
  namespaces=$(list_static_sessionspaces)
  [ -n "$namespaces" ] || return

  access_key=$(kubectl_ctx -n workflows get secret artifact-s3 -o jsonpath='{.data.access-key}' | base64 -d)
  secret_key=$(kubectl_ctx -n workflows get secret artifact-s3 -o jsonpath='{.data.secret-key}' | base64 -d)

  for namespace in $namespaces; do
    kubectl_ctx -n "$namespace" create secret generic artifact-s3 \
      --from-literal="access-key=$access_key" \
      --from-literal="secret-key=$secret_key" \
      --dry-run=client \
      -o yaml | kubectl_ctx apply -f - >/dev/null
  done
}

wait_for_static_sessionspace_bootstrap() {
  namespaces=$(list_static_sessionspaces)
  [ -n "$namespaces" ] || return

  deadline=$(($(date +%s) + 120))

  while [ "$(date +%s)" -lt "$deadline" ]; do
    ready=true

    for namespace in $namespaces; do
      kubectl_ctx -n "$namespace" get serviceaccount argo-workflow >/dev/null 2>&1 || ready=false
      kubectl_ctx -n "$namespace" get rolebinding argo-workflow >/dev/null 2>&1 || ready=false
      kubectl_ctx -n "$namespace" get secret artifact-s3 >/dev/null 2>&1 || ready=false
    done

    if [ "$ready" = "true" ]; then
      return
    fi

    sleep 2
  done

  echo "Timed out waiting for static sessionspaces bootstrap resources." >&2
  exit 1
}

install_local_starter_templates() {
  [ "$WORKFLOWS_LOCAL_INSTALL_STARTER_TEMPLATES" = "true" ] || return
  kubectl_ctx apply -f "$ROOT_DIR/examples/local-templates/starter-templates.yaml"
}

cluster_node_arch() {
  kubectl_ctx get nodes -o jsonpath='{.items[0].status.nodeInfo.architecture}'
}

load_image_into_cluster() {
  image_ref=$1

  if command -v kind >/dev/null 2>&1 && [ "$KUBE_CONTEXT" = "kind-$CLUSTER_NAME" ]; then
    kind load docker-image "$image_ref" --name "$CLUSTER_NAME"
    return
  fi

  if command -v minikube >/dev/null 2>&1 && [ "$KUBE_CONTEXT" = "$MINIKUBE_PROFILE" ]; then
    minikube -p "$MINIKUBE_PROFILE" image load "$image_ref"
    return
  fi

  echo "Unable to load local image $image_ref into cluster context $KUBE_CONTEXT." >&2
  exit 1
}

build_local_runtime_images() {
  graph_proxy_image="$GRAPH_PROXY_LOCAL_REPOSITORY:$GRAPH_PROXY_LOCAL_TAG"
  dashboard_image="$DASHBOARD_LOCAL_REPOSITORY:$DASHBOARD_LOCAL_TAG"

  require_cmd docker

  if [ "$WORKFLOWS_LOCAL_REBUILD_IMAGES" = "true" ] || ! docker image inspect "$graph_proxy_image" >/dev/null 2>&1; then
    docker build \
      --platform "linux/$NODE_ARCH" \
      -f backend/Dockerfile.graph-proxy \
      -t "$graph_proxy_image" \
      --build-arg ARGO_SERVER_SCHEMA_URL="$ARGO_SERVER_SCHEMA_URL" \
      backend
  fi

  load_image_into_cluster "$graph_proxy_image"
  USE_LOCAL_GRAPH_PROXY_IMAGE=true

  if [ -f frontend/supergraph.graphql ]; then
    if [ "$WORKFLOWS_LOCAL_REBUILD_IMAGES" = "true" ] || ! docker image inspect "$dashboard_image" >/dev/null 2>&1; then
      docker build \
        --platform "linux/$NODE_ARCH" \
        -f frontend/Dockerfile \
        -t "$dashboard_image" \
        frontend
    fi

    load_image_into_cluster "$dashboard_image"
    USE_LOCAL_DASHBOARD_IMAGE=true
    return
  fi

  echo "Skipping dashboard image build: frontend/supergraph.graphql is missing." >&2
  INSTALL_DASHBOARD=false
}

require_cluster
kubectl_ctx cluster-info >/dev/null
NODE_ARCH=$(cluster_node_arch)
cd "$ROOT_DIR"

case "$WORKFLOWS_LOCAL_BUILD_IMAGES" in
  true)
    build_local_runtime_images
    ;;
  false)
    ;;
  auto)
    case "$NODE_ARCH" in
      arm64|aarch64)
        build_local_runtime_images
        ;;
    esac
    ;;
  *)
    echo "WORKFLOWS_LOCAL_BUILD_IMAGES must be one of: auto, true, false" >&2
    exit 1
    ;;
esac

case "$WORKFLOWS_LOCAL_INSTALL_DASHBOARD" in
  true)
    INSTALL_DASHBOARD=true
    ;;
  false)
    INSTALL_DASHBOARD=false
    ;;
  auto)
    if [ "$NODE_ARCH" = "arm64" ] || [ "$NODE_ARCH" = "aarch64" ]; then
      if [ "$USE_LOCAL_DASHBOARD_IMAGE" != "true" ]; then
        INSTALL_DASHBOARD=false
      fi
    fi
    ;;
  *)
    echo "WORKFLOWS_LOCAL_INSTALL_DASHBOARD must be one of: auto, true, false" >&2
    exit 1
    ;;
esac

helm repo add kyverno https://kyverno.github.io/kyverno >/dev/null 2>&1 || true
helm repo update >/dev/null

helm dependency build charts/kueue
helm dependency build charts/workflows/charts/s3mock
helm dependency build charts/workflows
helm dependency build charts/sessionspaces
helm dependency build charts/graph-proxy
if [ "$INSTALL_DASHBOARD" = "true" ]; then
  helm dependency build charts/dashboard
fi

helm_ctx upgrade --install kyverno kyverno/kyverno \
  --version 3.5.2 \
  --namespace kyverno \
  --create-namespace
kubectl_ctx wait --for=condition=available deployment --all \
  -n kyverno --timeout=180s

helm_ctx upgrade --install kueue charts/kueue \
  --namespace kueue-system \
  --create-namespace \
  -f charts/kueue/local-values.yaml \
  --set bootstrapResources.enabled=false \
  --set createDefaultLocalQueues=false
kubectl_ctx wait --for=condition=available deployment --all \
  -n kueue-system --timeout=180s
helm template kueue-bootstrap charts/kueue \
  -f charts/kueue/local-values.yaml \
  --show-only templates/default-resourceflavor.yaml \
  --show-only templates/workloadpriorityclasses.yaml \
  --show-only templates/default-clusterqueue.yaml | kubectl_ctx apply -f -

helm_ctx upgrade --install workflows charts/workflows \
  --namespace workflows \
  --create-namespace \
  -f charts/workflows/local-values.yaml \
  --set-string uid="$UID_VALUE"
kubectl_ctx wait --for=condition=available deployment --all \
  -n workflows --timeout=180s

adopt_static_sessionspaces
helm_ctx upgrade --install sessionspaces charts/sessionspaces \
  --namespace sessionspaces \
  --create-namespace \
  -f charts/sessionspaces/local-values.yaml
sync_static_sessionspaces
wait_for_static_sessionspace_bootstrap
install_local_starter_templates

if [ "$USE_LOCAL_GRAPH_PROXY_IMAGE" = "true" ]; then
  helm_ctx upgrade --install graph-proxy charts/graph-proxy \
    --namespace graph-proxy \
    --create-namespace \
    -f charts/graph-proxy/local-values.yaml \
    --set-string image.registry= \
    --set-string image.repository="$GRAPH_PROXY_LOCAL_REPOSITORY" \
    --set-string image.tag="$GRAPH_PROXY_LOCAL_TAG" \
    --set-string image.pullPolicy=Never

else
  helm_ctx upgrade --install graph-proxy charts/graph-proxy \
    --namespace graph-proxy \
    --create-namespace \
    -f charts/graph-proxy/local-values.yaml
fi

kubectl_ctx wait --for=condition=available deployment/graph-proxy \
  -n graph-proxy --timeout=180s

if [ "$INSTALL_DASHBOARD" = "true" ]; then
  if [ "$USE_LOCAL_DASHBOARD_IMAGE" = "true" ]; then
    helm_ctx upgrade --install dashboard charts/dashboard \
      --namespace dashboard \
      --create-namespace \
      -f charts/dashboard/local-values.yaml \
      --set-string image.registry= \
      --set-string image.repository="$DASHBOARD_LOCAL_REPOSITORY" \
      --set-string image.tag="$DASHBOARD_LOCAL_TAG" \
      --set-string image.pullPolicy=Never
  else
    helm_ctx upgrade --install dashboard charts/dashboard \
      --namespace dashboard \
      --create-namespace \
      -f charts/dashboard/local-values.yaml
  fi

  kubectl_ctx wait --for=condition=available deployment/dashboard \
    -n dashboard --timeout=180s
else
  helm_ctx uninstall dashboard --namespace dashboard >/dev/null 2>&1 || true
fi

cat <<EOF
Local cluster profile installed.

Suggested port-forwards:
  kubectl --context "$KUBE_CONTEXT" -n workflows port-forward svc/workflows-argo-workflows-server 2746:2746
  kubectl --context "$KUBE_CONTEXT" -n graph-proxy port-forward svc/graph-proxy 8081:80
EOF

if [ "$INSTALL_DASHBOARD" = "true" ]; then
  cat <<EOF
  kubectl --context "$KUBE_CONTEXT" -n dashboard port-forward svc/dashboard 8080:80

Optional frontend-from-source flow:
  cd frontend
  cp dashboard/.env.local.example dashboard/.env.local
  yarn install
  yarn run --cwd=relay-workflows-lib relay
  yarn run --cwd=dashboard dev
EOF
else
  cat <<EOF

Dashboard was not installed.
On arm64, the published dashboard image lacks a compatible manifest and the local
dashboard build additionally requires frontend/supergraph.graphql from CI.
EOF
fi
