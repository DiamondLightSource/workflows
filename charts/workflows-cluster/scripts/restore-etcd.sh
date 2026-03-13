#!/bin/bash

if [ -z "$KUBECONFIG" ]
then
    echo "Kube config not found - have you loaded a cluster?"
    exit 1
fi

CLUSTER=$(cat $KUBECONFIG | grep "cluster: " | awk '{print $2}')

cd "${0%/*}/.."

read -p "WARNING: You are about to attempt a full restore of the VCluster etcd on $CLUSTER. Proceed? (y/n)" -r
if [[ $REPLY =~ ^[Yy]$ && ! -z "$CLUSTER" ]]
then
    ETCD_REPLICAS=$(kubectl get sts workflows-cluster-etcd -n workflows -o=jsonpath='{.spec.replicas}')
    DEPLOY_REPLICAS=$(kubectl get deploy workflows-cluster -n workflows -o=jsonpath='{.spec.replicas}')
    echo "Scaling down..."
    kubectl scale sts workflows-cluster-etcd -n workflows --replicas=0
    kubectl scale deploy workflows-cluster -n workflows --replicas=0

    kubectl wait --for=delete pod -l app=vcluster-etcd -n workflows --timeout=300s
    kubectl wait --for=delete pod -l app=vcluster -n workflows --timeout=300s

    echo "Scale down complete. Creating restoration Jobs."

    for ((i=0;i<ETCD_REPLICAS;i++)); do
        kubectl -n workflows create job --from=cronjob/restore-etcd-$i restore-etcd-$i
    done

    echo "Waiting for Jobs to complete..."

    for ((i=0;i<ETCD_REPLICAS;i++)); do
        kubectl -n workflows wait --for=condition=complete job/restore-etcd-$i --timeout=300s
        kubectl -n workflows delete job/restore-etcd-$i
    done

    echo "Jobs complete. Scaling back up..."

    kubectl -n workflows scale sts workflows-cluster-etcd --replicas=$ETCD_REPLICAS
    kubectl wait --for=condition=Ready pod -l app=vcluster-etcd -n workflows --timeout=300s

    kubectl -n workflows scale deploy workflows-cluster --replicas=$DEPLOY_REPLICAS
    kubectl wait --for=condition=Ready pod -l app=vcluster -n workflows --timeout=300s
    echo "Restore complete."
fi
