#!/usr/bin/env bash
# Spin up a throwaway local cluster with workloads in every state, so you can
# test kubemapper's live mode exactly like a user with a real cluster would.
#
# Usage:  ./scripts/local-test.sh
# Needs:  docker running, minikube installed.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> starting minikube (this pulls images on first run)"
minikube status >/dev/null 2>&1 || minikube start

echo "==> enabling metrics-server (drives the CPU fill levels)"
minikube addons enable metrics-server

echo "==> deploying sample workloads (healthy / hot / crashing / pending)"
kubectl apply -f examples/demo-workloads.yaml

echo "==> waiting a bit for pods to reach their states..."
sleep 20
kubectl get pods

cat <<'EOF'

==> ready. Now run kubemapper against this cluster:

    cd cli && node dist/cli.js        # or: npx kubemapper  (once published)

You should see: frontend healthy (4 pods), api vessels filling toward amber,
worker pulsing red with restarts, postgres a dashed pending ghost.

When done, tear it all down with:

    kubectl delete -f examples/demo-workloads.yaml
    minikube stop        # or: minikube delete   to remove the cluster entirely
EOF
