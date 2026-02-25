#!/usr/bin/env bash
set -euo pipefail

HARBOR_NS="${HARBOR_NS:-harbor}"
FLUX_NS="${FLUX_NS:-flux-system}"
BUILDER_NS="${BUILDER_NS:-staccato-staccato}"
REGISTRY_HOST="${REGISTRY_HOST:-harbor-core.harbor.svc.cluster.local}"
HARBOR_ADMIN_PASSWORD="${HARBOR_ADMIN_PASSWORD:-Harbor12345}"

echo "-> Ensuring Harbor admin credentials in ${HARBOR_NS}"
kubectl create secret generic harbor-admin-credentials \
  --namespace="${HARBOR_NS}" \
  --from-literal=username=admin \
  --from-literal=password="${HARBOR_ADMIN_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "-> Ensuring Harbor OCI credentials in ${FLUX_NS}"
kubectl create secret docker-registry harbor-oci-credentials \
  --namespace="${FLUX_NS}" \
  --docker-server="${REGISTRY_HOST}" \
  --docker-username=admin \
  --docker-password="${HARBOR_ADMIN_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

auth="$(printf 'admin:%s' "${HARBOR_ADMIN_PASSWORD}" | base64 | tr -d '\n')"
dockerconfig="$(printf '{\"experimental\":\"enabled\",\"auths\":{\"%s\":{\"auth\":\"%s\"},\"%s:80\":{\"auth\":\"%s\"}},\"credHelpers\":{}}' "${REGISTRY_HOST}" "${auth}" "${REGISTRY_HOST}" "${auth}")"
encoded_config="$(printf '%s' "${dockerconfig}" | base64 | tr -d '\n')"

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
  exit 0
fi

for secret_name in "${buildkit_secrets[@]}"; do
  echo "-> Syncing Harbor push credentials into ${BUILDER_NS}/${secret_name}"
  kubectl patch secret "${secret_name}" \
    -n "${BUILDER_NS}" \
    --type=merge \
    -p "{\"data\":{\".dockerconfigjson\":\"${encoded_config}\"}}"
done

if kubectl get deployment garden-buildkit -n "${BUILDER_NS}" >/dev/null 2>&1; then
  echo "-> Restarting garden-buildkit so the updated auth is mounted immediately"
  kubectl rollout restart deployment/garden-buildkit -n "${BUILDER_NS}"
  kubectl rollout status deployment/garden-buildkit -n "${BUILDER_NS}" --timeout=180s
fi

echo "-> Harbor and Garden buildkit credentials are ready"
