#!/usr/bin/env bash
set -euo pipefail

HARBOR_NS="${HARBOR_NS:-harbor}"
FLUX_NS="${FLUX_NS:-flux-system}"
BUILDER_NS="${BUILDER_NS:-staccato-staccato}"
HARBOR_ADMIN_PASSWORD="${HARBOR_ADMIN_PASSWORD:-Harbor12345}"
BUILDKIT_SECRET_NAME="${BUILDKIT_SECRET_NAME:-garden-harbor-auth}"

echo "-> Ensuring Harbor admin credentials in ${HARBOR_NS}"
kubectl create secret generic harbor-admin-credentials \
  --namespace="${HARBOR_NS}" \
  --from-literal=username=admin \
  --from-literal=password="${HARBOR_ADMIN_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "-> Waiting for declarative Harbor OCI credentials in ${FLUX_NS}"
encoded_config=""
for _ in $(seq 1 30); do
  encoded_config="$(kubectl get secret harbor-oci-credentials --namespace="${FLUX_NS}" -o jsonpath='{.data.\.dockerconfigjson}' 2>/dev/null || true)"
  if [ -n "${encoded_config}" ]; then
    break
  fi
  sleep 2
done

if [ -z "${encoded_config}" ]; then
  echo "ERROR: missing ${FLUX_NS}/harbor-oci-credentials; apply the st-workloads addon first" >&2
  exit 1
fi

echo "-> Ensuring dedicated Garden buildkit auth secret in ${BUILDER_NS}"
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ${BUILDKIT_SECRET_NAME}
  namespace: ${BUILDER_NS}
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ${encoded_config}
EOF

mapfile -t buildkit_secrets < <(
  kubectl get secret -n "${BUILDER_NS}" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' |
    while IFS= read -r name; do
      case "${name}" in
        garden-docker-auth-*)
          printf '%s\n' "${name}"
          ;;
      esac
    done
)

if [ "${#buildkit_secrets[@]}" -eq 0 ]; then
  echo "No Garden buildkit auth secrets found in ${BUILDER_NS}; skipping buildkit credential sync"
else
  for secret_name in "${buildkit_secrets[@]}"; do
    echo "-> Syncing Harbor push credentials into ${BUILDER_NS}/${secret_name}"
    kubectl patch secret "${secret_name}" \
      -n "${BUILDER_NS}" \
      --type=merge \
      -p "{\"data\":{\".dockerconfigjson\":\"${encoded_config}\"}}"
  done
fi

if kubectl get deployment garden-buildkit -n "${BUILDER_NS}" >/dev/null 2>&1; then
  echo "-> Patching garden-buildkit deployment to use ${BUILDKIT_SECRET_NAME} for all new pods"
  kubectl patch deployment garden-buildkit \
    -n "${BUILDER_NS}" \
    --type=json \
    -p "[
      {\"op\":\"replace\",\"path\":\"/spec/template/spec/volumes/0/name\",\"value\":\"${BUILDKIT_SECRET_NAME}\"},
      {\"op\":\"replace\",\"path\":\"/spec/template/spec/volumes/0/secret/secretName\",\"value\":\"${BUILDKIT_SECRET_NAME}\"},
      {\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/volumeMounts/0/name\",\"value\":\"${BUILDKIT_SECRET_NAME}\"},
      {\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/1/volumeMounts/0/name\",\"value\":\"${BUILDKIT_SECRET_NAME}\"}
    ]"
  echo "-> Restarting garden-buildkit so the updated auth is mounted immediately"
  kubectl rollout restart deployment/garden-buildkit -n "${BUILDER_NS}"
  kubectl rollout status deployment/garden-buildkit -n "${BUILDER_NS}" --timeout=180s
fi

echo "-> Harbor and Garden buildkit credentials are ready"
