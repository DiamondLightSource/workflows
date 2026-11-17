#!/usr/bin/env bash
# Render the CEL admission policies from a chart and apply (or delete) them.
#
# The Chainsaw suites call this instead of embedding copies of the policies in
# their test manifests, so the templates that actually ship are the ones under
# test. Anything after the options below is forwarded to `helm template`, which
# is how a suite selects non-default values (for example `--set allowTriggerUid=false`).
#
# Chart dependencies must be present (`helm dependency build charts/<chart>`)
# before the policies can be rendered.
#
# Usage:
#   render-cel-policies.sh --chart <chart> --release <name> [--delete] [helm args...]
#
#   --chart    chart directory name under charts/ (for example `workflows`)
#   --release  Helm release name; it becomes part of the policy names
#   --delete   delete the rendered policies instead of applying them
set -euo pipefail

chart=""
release=""
action="apply"
helm_args=()

usage() {
  cat <<'EOF'
Usage: render-cel-policies.sh --chart <chart> --release <name> [--delete] [helm args...]

  --chart    chart directory name under charts/ (for example `workflows`)
  --release  Helm release name; it becomes part of the policy names
  --delete   delete the rendered policies instead of applying them

Trailing arguments are forwarded to `helm template`.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
  -c | --chart)
    chart="${2:?--chart needs a value}"
    shift 2
    ;;
  -r | --release)
    release="${2:?--release needs a value}"
    shift 2
    ;;
  -d | --delete)
    action="delete"
    shift
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    helm_args+=("$1")
    shift
    ;;
  esac
done

if [[ -z "$chart" || -z "$release" ]]; then
  usage >&2
  exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
chart_dir="${repo_root}/charts/${chart}"
if [[ ! -d "$chart_dir" ]]; then
  echo "chart not found: ${chart_dir}" >&2
  exit 2
fi

rendered="$(mktemp)"
trap 'rm -f "${rendered}"' EXIT

helm template "$release" "$chart_dir" --namespace cel-policy-test "${helm_args[@]}" |
  yq eval 'select(
      .kind == "ValidatingAdmissionPolicy" or
      .kind == "ValidatingAdmissionPolicyBinding" or
      .kind == "MutatingAdmissionPolicy" or
      .kind == "MutatingAdmissionPolicyBinding"
    )' >"${rendered}"

if [[ ! -s "${rendered}" ]]; then
  echo "no admission policies rendered from chart '${chart}'" >&2
  exit 1
fi

# MutatingAdmissionPolicy was promoted from v1beta1 to v1. Test whatever the
# cluster serves so the same suites run on the beta-only and GA clusters.
# Probe the resource's served versions directly rather than grepping the
# group-level discovery (`/apis/admissionregistration.k8s.io`), which can omit
# a feature-gated group version even when the resource is served.
if kubectl get --raw /apis/admissionregistration.k8s.io/v1beta1/mutatingadmissionpolicies >/dev/null 2>&1; then
  policy_api="v1beta1"
elif kubectl get --raw /apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicies >/dev/null 2>&1; then
  policy_api="v1"
else
  echo "cluster serves MutatingAdmissionPolicy at neither admissionregistration.k8s.io/v1beta1 nor /v1" >&2
  exit 1
fi
sed -i "s|admissionregistration.k8s.io/v1beta1|admissionregistration.k8s.io/${policy_api}|g" "${rendered}"

if [[ "$action" == "delete" ]]; then
  kubectl delete --ignore-not-found -f "${rendered}"
else
  # Client-side validation fetches the OpenAPI document, which fails when the
  # cluster is reached through a name the serving certificate does not cover
  # (Chainsaw's generated kubeconfig can lose `insecure-skip-tls-verify`). The
  # API server still validates the policies and compiles the CEL expressions.
  kubectl apply --validate=false -f "${rendered}"
fi
