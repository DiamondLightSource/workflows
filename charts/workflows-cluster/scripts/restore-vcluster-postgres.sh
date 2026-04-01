#!/usr/bin/env bash

set -euo pipefail

if [ -z "$KUBECONFIG" ]
then
    echo "ERROR: Kube config not found - have you loaded a cluster?"
    exit 1
fi

CLUSTER=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')

if [[ "$CLUSTER" == vcluster* ]]; then
    CLUSTER_NAME=$(echo $CLUSTER | awk -F"@" '{print $2}')
    cd "${0%/*}/.."
    read -p "WARNING: You are about to attempt a full restore of the Argo Workflows database on $CLUSTER_NAME. Proceed? (y/n)" -r
    if [[ $REPLY =~ ^[Yy]$ && ! -z "$CLUSTER_NAME" ]]; then
        kubectl -n workflows delete job restore-postgres --ignore-not-found
        helm template . -s templates/postgres-restore-job.yaml | kubectl -n workflows apply -f -
        kubectl -n workflows get job restore-postgres >/dev/null
        if ! kubectl -n workflows wait --for=condition=complete job/restore-postgres --timeout=120s; then
            echo "Restore job failed or timed out. Fetching logs..."
            kubectl -n workflows logs job/restore-postgres --all-containers=true
            exit 1
        fi
        echo "Restore complete."
    fi
else 
    echo "ERROR: This scipt must be run inside the VCluster"
    exit 1
fi

 

