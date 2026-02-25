import (
	"encoding/json"
)

"staccato-environment": {
	description: "Renders an OAM Application that (1) creates a ConfigMap with kustomization.yaml describing the environment's Helm charts, and (2) in dev mode, runs a Job that builds those charts and pushes the rendered manifests to the in-cluster Harbor OCI repo."
	type:        "component"
	attributes: workload: type: "autodetects.core.oam.dev"
}

template: {
	_env: parameter.environment

	// _baseCharts: one entry per named service that carries full Helm chart
	// coordinates and is toggled by a single `enabled` bool. Absent when disabled.
	_baseCharts: [
		if _env."cert-manager".enabled {
			{
				name:        _env."cert-manager".releaseName
				repo:        _env."cert-manager".repo
				version:     _env."cert-manager".version
				namespace:   _env."cert-manager".namespace
				releaseName: _env."cert-manager".releaseName
				includeCRDs: _env."cert-manager".includeCRDs
			}
		},
		if _env.trivy.enabled {
			{
				name:        _env.trivy.releaseName
				repo:        _env.trivy.repo
				version:     _env.trivy.version
				namespace:   _env.trivy.namespace
				releaseName: _env.trivy.releaseName
				includeCRDs: _env.trivy.includeCRDs
			}
		},
		if _env.keda.enabled {
			{
				name:        _env.keda.releaseName
				repo:        _env.keda.repo
				version:     _env.keda.version
				namespace:   _env.keda.namespace
				releaseName: _env.keda.releaseName
				includeCRDs: _env.keda.includeCRDs
			}
		},
		if _env."otel-collector-operator".enabled {
			{
				name:        _env."otel-collector-operator".releaseName
				repo:        _env."otel-collector-operator".repo
				version:     _env."otel-collector-operator".version
				namespace:   _env."otel-collector-operator".namespace
				releaseName: _env."otel-collector-operator".releaseName
				includeCRDs: _env."otel-collector-operator".includeCRDs
			}
		},
		if _env.reloader.enabled {
			{
				name:        _env.reloader.releaseName
				repo:        _env.reloader.repo
				version:     _env.reloader.version
				namespace:   _env.reloader.namespace
				releaseName: _env.reloader.releaseName
				includeCRDs: _env.reloader.includeCRDs
			}
		},
		if _env.headlamp.enabled {
			{
				name:        _env.headlamp.releaseName
				repo:        _env.headlamp.repo
				version:     _env.headlamp.version
				namespace:   _env.headlamp.namespace
				releaseName: _env.headlamp.releaseName
				includeCRDs: _env.headlamp.includeCRDs
			}
		},
		if _env."pulumi-operator".enabled {
			{
				name:        _env."pulumi-operator".releaseName
				repo:        _env."pulumi-operator".repo
				version:     _env."pulumi-operator".version
				namespace:   _env."pulumi-operator".namespace
				releaseName: _env."pulumi-operator".releaseName
				includeCRDs: _env."pulumi-operator".includeCRDs
			}
		},
	]

	// _externalDnsCharts: one chart entry per enabled external-dns instance.
	// Gated on the top-level external-dns.enabled flag; within that, only
	// instances with enabled: true are emitted, allowing staged rollouts without
	// removing entries from the list.
	_externalDnsCharts: [
		if _env."external-dns".enabled {
			for inst in _env."external-dns".instances
			if inst.enabled {
				{
					name:        "external-dns-\(inst.provider)"
					repo:        _env."external-dns".repo
					version:     _env."external-dns".version
					namespace:   inst.namespace
					releaseName: "external-dns-\(inst.provider)"
					includeCRDs: false
				}
			}
		},
	]

	// _charts is the full ordered list rendered into kustomization.yaml.
	_charts: _baseCharts + _externalDnsCharts

	// _configMapName is the stable name used by both the ConfigMap resource and
	// the Job's volume mount so they stay in sync.
	_configMapName: "env-\(parameter.name)"

	// _jobName is unique per environment to avoid conflicts on re-renders.
	_jobName: "render-\(parameter.name)"

	// _kustomizationYAML produces a JSON-format kustomization (JSON is valid YAML;
	// kustomize build --enable-helm accepts it). Encoded here so the in-cluster Job
	// can extract and use it directly without CUE or OAM tooling.
	_kustomizationYAML: json.Marshal({
		apiVersion: "kustomize.config.k8s.io/v1beta1"
		kind:       "Kustomization"
		helmCharts: [for c in _charts {
			name:        c.name
			repo:        c.repo
			version:     c.version
			namespace:   c.namespace
			releaseName: c.releaseName
			includeCRDs: c.includeCRDs
		}]
	})

	// _configMap is the environment descriptor. The kustomization.yaml key is read
	// by the render Job (and by `staccato bootstrap render-and-push` in local dev).
	_configMap: {
		apiVersion: "v1"
		kind:       "ConfigMap"
		metadata: {
			name:      _configMapName
			namespace: parameter.namespace
			labels: {
				"st-environment/name":          parameter.name
				"app.kubernetes.io/managed-by": "kubevela"
				"app.kubernetes.io/part-of":    "st-environment"
			}
		}
		data: {
			name:        parameter.name
			description: parameter.description
			// kustomization.yaml is read by the render Job and by the staccato CLI.
			"kustomization.yaml": _kustomizationYAML
		}
	}

	// _renderJob builds and pushes rendered Helm manifests to in-cluster Harbor.
	// Only emitted when mode == "dev".
	//
	// The container is alpine:latest with kustomize, helm, yq, and flux installed
	// at Job startup. No external image registry beyond Alpine and the upstream
	// tool release URLs is required — all tooling is fetched from public endpoints.
	//
	// Script phases (mirrors the Dagger Render function in src/ops/workloads/render.go):
	//
	//   Install — apk installs curl/tar; helm, kustomize, yq, and flux-cli are
	//             downloaded from their official release tarballs.
	//
	//   Auth    — $DOCKER_CONFIG_JSON (from the harbor-oci-credentials Secret) is
	//             written to ~/.docker/config.json so flux push artifact can
	//             authenticate against the in-cluster Harbor registry.
	//
	//   Phase 1 — For each helmCharts entry in kustomization.yaml, yq extracts the
	//             chart fields, a single-chart kustomization.yaml is written to a
	//             temp dir, and `kustomize build --enable-helm` renders the YAML.
	//             Output is saved to /tmp/rendered/<chart-name>/manifest.yaml.
	//             All charts are rendered before any push begins (atomicity: a
	//             render failure aborts before any artifact is pushed).
	//
	//   Phase 2 — For each saved render output, `flux push artifact` pushes to
	//             <gitopsConfig.url>/<chart-name>:<env>-<gitopsConfig.ref>.
	//             This matches the OCI URL scheme used by the Dagger pipeline and
	//             expected by Flux's OCIRepository source.
	//
	// Harbor credentials: the harbor-oci-credentials Secret (.dockerconfigjson key)
	// must exist in parameter.namespace (vela-system) before the Job runs. Note that
	// the bootstrap CLI creates this Secret in flux-system for Flux's own use — a
	// copy must also be present in vela-system. The bootstrap sequence is responsible
	// for ensuring this (kubectl create secret ... -n vela-system).
	//
	// The Secret is mounted as a volume into /docker-config/ with the key renamed to
	// config.json. DOCKER_CONFIG is set to /docker-config so flux push artifact picks
	// up the credentials without any shell write step.
	_renderJob: {
		apiVersion: "batch/v1"
		kind:       "Job"
		metadata: {
			name:      _jobName
			namespace: parameter.namespace
			labels: {
				"st-environment/name":   parameter.name
				"st-environment/render": "true"
				"st-environment/mode":   parameter.mode
			}
		}
		spec: {
			// Auto-clean completed Jobs after 5 minutes so re-renders are idempotent.
			ttlSecondsAfterFinished: 300
			backoffLimit: 2
			template: spec: {
				restartPolicy: "Never"
				containers: [{
					name:  "render"
					image: "alpine:latest"
					command: ["sh", "-c"]
					args: [#"""
						set -euo pipefail

						# ── Install tooling ──────────────────────────────────────────────
						apk add --no-cache curl tar

						# helm v3 (required by kustomize --enable-helm inflator)
						curl -fsSL https://get.helm.sh/helm-v3.17.0-linux-amd64.tar.gz \
						  | tar xz --strip=1 -C /usr/local/bin linux-amd64/helm

						# kustomize v5.3.0
						curl -fsSL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz \
						  | tar xz -C /usr/local/bin

						# yq v4 (mikefarah) — parses helmCharts list from kustomization.yaml
						curl -fsSL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 \
						  -o /usr/local/bin/yq && chmod +x /usr/local/bin/yq

						# flux CLI v2 — pushes OCI artifacts to Harbor
						curl -fsSL https://github.com/fluxcd/flux2/releases/latest/download/flux_linux_amd64.tar.gz \
						  | tar xz -C /usr/local/bin

						# ── Phase 1: render all charts ───────────────────────────────────
						# yq reads the helmCharts array length so we can iterate by index.
						KUSTOMIZATION=/kustomization/kustomization.yaml
						COUNT=$(yq '.helmCharts | length' "${KUSTOMIZATION}")

						if [ "${COUNT}" -eq 0 ]; then
						  echo "ERROR: kustomization.yaml contains no helmCharts entries" >&2
						  exit 1
						fi

						mkdir -p /tmp/rendered

						i=0
						while [ "$i" -lt "$COUNT" ]; do
						  NAME=$(yq ".helmCharts[$i].name"        "${KUSTOMIZATION}")
						  REPO=$(yq ".helmCharts[$i].repo"        "${KUSTOMIZATION}")
						  VER=$(yq  ".helmCharts[$i].version"     "${KUSTOMIZATION}")
						  NS=$(yq   ".helmCharts[$i].namespace"   "${KUSTOMIZATION}")
						  REL=$(yq  ".helmCharts[$i].releaseName" "${KUSTOMIZATION}")
						  CRDS=$(yq ".helmCharts[$i].includeCRDs" "${KUSTOMIZATION}")

						  # Default releaseName to name when absent/null (matches render.go).
						  [ "${REL}" = "null" ] && REL="${NAME}"

						  echo "==> Rendering chart ${NAME} (${REPO} @ ${VER})"

						  # Write a single-chart kustomization to isolate this chart's output.
						  CHART_DIR="/tmp/chart-${NAME}"
						  mkdir -p "${CHART_DIR}"
						  cat > "${CHART_DIR}/kustomization.yaml" <<KEOF
						{"apiVersion":"kustomize.config.k8s.io/v1beta1","kind":"Kustomization","helmCharts":[{"name":"${NAME}","repo":"${REPO}","version":"${VER}","namespace":"${NS}","releaseName":"${REL}","includeCRDs":${CRDS}}]}
						KEOF

						  OUT_DIR="/tmp/rendered/${NAME}"
						  mkdir -p "${OUT_DIR}"
						  kustomize build --enable-helm "${CHART_DIR}" > "${OUT_DIR}/manifest.yaml"

						  echo "    rendered $(wc -c < "${OUT_DIR}/manifest.yaml") bytes"
						  i=$((i + 1))
						done

						echo "Phase 1 complete: all ${COUNT} charts rendered."

						# ── Phase 2: push each chart's artifact to Harbor ─────────────────
						i=0
						while [ "$i" -lt "$COUNT" ]; do
						  NAME=$(yq ".helmCharts[$i].name" "${KUSTOMIZATION}")
						  ARTIFACT_URL="${REGISTRY_URL}/${NAME}:${ENV}-${TAG}"

						  echo "==> Pushing ${ARTIFACT_URL}"
						  flux push artifact "${ARTIFACT_URL}" \
						    --path="/tmp/rendered/${NAME}" \
						    --source="staccato-environment/${ENV}" \
						    --revision="${TAG}"

						  i=$((i + 1))
						done

						echo "Phase 2 complete: all ${COUNT} artifacts pushed to ${REGISTRY_URL}."
						"""#]
					env: [
						{
							// DOCKER_CONFIG points flux push artifact at the mounted credentials
							// directory. flux (like Docker) looks for config.json inside this dir.
							name:  "DOCKER_CONFIG"
							value: "/docker-config"
						},
						{
							name:  "REGISTRY_URL"
							value: parameter.gitopsConfig.url
						},
						{
							name:  "TAG"
							value: parameter.gitopsConfig.ref
						},
						{
							name:  "ENV"
							value: parameter.name
						},
					]
					volumeMounts: [
						{
							name:      "kustomization"
							mountPath: "/kustomization"
							readOnly:  true
						},
						{
							// Mounted so DOCKER_CONFIG=/docker-config gives flux config.json.
							name:      "docker-config"
							mountPath: "/docker-config"
							readOnly:  true
						},
					]
				}]
				volumes: [
					{
						name: "kustomization"
						configMap: {
							name: _configMapName
							items: [{
								key:  "kustomization.yaml"
								path: "kustomization.yaml"
							}]
						}
					},
					{
						// harbor-oci-credentials must exist in parameter.namespace (vela-system).
						// The .dockerconfigjson key is projected as config.json so DOCKER_CONFIG
						// can point at this directory directly without any shell write step.
						name: "docker-config"
						secret: {
							secretName: parameter.gitopsConfig.pullSecret
							items: [{
								key:  ".dockerconfigjson"
								path: "config.json"
							}]
						}
					},
				]
			}
		}
	}

	// _authProviderComponent emits a component entry for the auth provider when
	// it is enabled and carries a name. The component type comes from the provider's
	// own `type` field (e.g. "auth-casdoor"), allowing the provider to be swapped
	// without changing this definition.
	_authProviderComponent: [
		if parameter."auth-provider".enabled && parameter."auth-provider".name != _|_ {
			{
				name: parameter."auth-provider".name
				type: parameter."auth-provider".type
				properties: {
					name:      parameter."auth-provider".name
					namespace: parameter."auth-provider".namespace
				}
			}
		},
	]

	// _observabilityProviderComponent mirrors _authProviderComponent for the
	// observability provider (e.g. "observability-lgtm" / "hosted-lgtm").
	_observabilityProviderComponent: [
		if parameter."observability-provider".enabled && parameter."observability-provider".name != _|_ {
			{
				name: parameter."observability-provider".name
				type: parameter."observability-provider".type
				properties: {
					name:      parameter."observability-provider".name
					namespace: parameter."observability-provider".namespace
				}
			}
		},
	]

	// _wasmcloudComponent emits a component entry for the wasmcloud runtime when
	// it is enabled and carries a name. Uses "runtime-wasmcloud" as the OAM component
	// type to deploy the wasmcloud-operator Helm chart and an optional WasmCloudHostConfig.
	_wasmcloudComponent: [
		if parameter.wasmcloud.enabled && parameter.wasmcloud.name != _|_ {
			{
				name: parameter.wasmcloud.name
				type: "runtime-wasmcloud"
				properties: {
					name:      parameter.wasmcloud.name
					namespace: parameter.wasmcloud.namespace
					if parameter.wasmcloud.target != _|_ {
						target: parameter.wasmcloud.target
					}
					if parameter.wasmcloud.chartVersion != _|_ {
						chartVersion: parameter.wasmcloud.chartVersion
					}
					if parameter.wasmcloud.hostConfig != _|_ {
						hostConfig: parameter.wasmcloud.hostConfig
					}
				}
			}
		},
	]

	// output renders an OAM Application that owns both the ConfigMap and (in dev
	// mode) the render Job. The Application's two-step workflow ensures the ConfigMap
	// exists before the Job mounts it. Enabled providers (auth, observability, wasmcloud)
	// with a name are appended as additional components after the config/render steps.
	output: {
		apiVersion: "core.oam.dev/v1beta1"
		kind:       "Application"
		metadata: {
			name:      _configMapName
			namespace: parameter.namespace
			labels: {
				"st-environment/name":          parameter.name
				"app.kubernetes.io/managed-by": "kubevela"
				"app.kubernetes.io/part-of":    "st-environment"
			}
		}
		spec: {
			components: [
				// Step 1 component: the environment ConfigMap.
				{
					name: "\(parameter.name)-config"
					type: "k8s-objects"
					properties: objects: [_configMap]
				},

				// Step 2 component: the render Job (dev mode only).
				if parameter.mode == "dev" {
					{
						name: "\(parameter.name)-render"
						type: "k8s-objects"
						properties: objects: [_renderJob]
					}
				},
			] + _authProviderComponent + _observabilityProviderComponent + _wasmcloudComponent

			workflow: steps: [
				// Always apply the ConfigMap first so the Job can mount it.
				{
					type: "apply-component"
					name: "apply-config"
					properties: component: "\(parameter.name)-config"
				},

				// Only run the render Job in dev mode. In non-dev environments the
				// operator runs `staccato bootstrap render-and-push` out-of-band or
				// uses the production Dagger pipeline (render-manifests workflow step).
				if parameter.mode == "dev" {
					{
						type: "apply-component"
						name: "apply-render-job"
						properties: component: "\(parameter.name)-render"
					}
				},
			] + [
				// Apply the auth provider component after config/render when present.
				for c in _authProviderComponent {
					{
						type: "apply-component"
						name: "apply-\(c.name)"
						properties: component: c.name
					}
				},
			] + [
				// Apply the observability provider component when present.
				for c in _observabilityProviderComponent {
					{
						type: "apply-component"
						name: "apply-\(c.name)"
						properties: component: c.name
					}
				},
			] + [
				// Apply the wasmcloud runtime component when present.
				for c in _wasmcloudComponent {
					{
						type: "apply-component"
						name: "apply-\(c.name)"
						properties: component: c.name
					}
				},
			]
		}
	}

	parameter: {
		//+usage=The name of the environment (e.g. "ops", "local", "runtime")
		name: string

		//+usage=Human-readable description of this environment
		description: *"" | string

		//+usage=Target namespace for the environment ConfigMap and render Job
		namespace: *"vela-system" | string

		//+usage=Render mode. "dev" creates the ConfigMap and immediately runs an
		//+usage=in-cluster alpine Job (kustomize + yq + flux) to build each Helm chart
		//+usage=and push its rendered manifests to Harbor as a separate OCI artifact.
		//+usage=Any other value creates only the ConfigMap; rendering is triggered
		//+usage=out-of-band (e.g. staccato bootstrap render-and-push from the Taskfile).
		mode: *"dev" | string

		//+usage=List of system components (schema TBD)
		systems: *[] | [...{}]

		//+usage=Auth provider. When enabled=true and name is set the provider is
		//+usage=added to the Application's component list using `type` as the OAM
		//+usage=component type (e.g. "auth-casdoor").
		"auth-provider": *{enabled: false} | {
			enabled:   bool
			type:      string
			name:      string
			namespace: *"auth" | string
		}

		//+usage=Observability provider. When enabled=true and name is set the
		//+usage=provider is added to the Application's component list using `type`
		//+usage=as the OAM component type (e.g. "observability-lgtm").
		"observability-provider": *{enabled: false} | {
			enabled:   bool
			type:      string
			name:      string
			namespace: *"monitoring" | string
		}

		//+usage=Dev tooling toggles (penpot, dev-portal, external-secrets).
		//+usage=Passed through for downstream consumers; they do not contribute
		//+usage=chart entries to the kustomization.yaml.
		//+usage=penpot: Penpot Helm chart configuration (chart: penpot, repo: https://helm.penpot.app).
		//+usage=  config.publicUri — externally reachable base URL (e.g. http://localhost:3000).
		//+usage=  config.flags    — space-separated feature flags string.
		//+usage=  config.apiSecretKey — 64+ char random secret; generate with:
		//+usage=    python3 -c "import secrets; print(secrets.token_urlsafe(64))"
		//+usage=  config.postgresql — connection details for the bundled or external PG instance.
		//+usage=  global.postgresqlEnabled — set true to deploy the bundled PostgreSQL subchart.
		//+usage=  ingress.enabled — set false to use Garden port-forwards for local dev.
		penpot: *{enabled: false} | {
			enabled: bool
			//+usage=Penpot Helm chart values passed verbatim to the downstream renderer.
			config: {
				//+usage=Publicly reachable base URL of the Penpot instance.
				publicUri: *"http://localhost:3000" | string
				//+usage=Space-separated Penpot feature flags.
				flags: *"enable-registration enable-login-with-password disable-email-verification disable-secure-session-cookies" | string
				//+usage=Random secret key (64+ chars). Required for signing sessions.
				apiSecretKey: string
				//+usage=PostgreSQL connection settings.
				postgresql: *{} | {
					host:     *"" | string
					username: *"penpot" | string
					password: string
					database: *"penpot" | string
				}
			}
			//+usage=Global subchart toggles.
			global: *{} | {
				//+usage=Deploy the bundled Bitnami PostgreSQL subchart.
				postgresqlEnabled: *true | bool
			}
			//+usage=Ingress configuration. Disable for local dev; use Garden port-forwards.
			ingress: *{enabled: false} | {
				enabled: bool
			}
		}
		"dev-portal":      *{enabled: false} | {...}
		//+usage=external-secrets operator Helm chart configuration
		//+usage=(chart: external-secrets, repo: https://charts.external-secrets.io).
		//+usage=  installCRDs       — install ESO CRDs via Helm (recommended: true).
		//+usage=  replicaCount      — number of controller replicas.
		//+usage=  namespace         — Kubernetes namespace to deploy into.
		//+usage=  webhook.create    — deploy the validating webhook (default: true).
		//+usage=  certController.create — deploy the cert-controller (default: true).
		//+usage=  serviceMonitor.enabled — create a Prometheus ServiceMonitor.
		"external-secrets": *{enabled: false} | {
			enabled: bool
			//+usage=Helm release name for the external-secrets installation.
			releaseName: *"external-secrets" | string
			//+usage=Helm chart version to pin (e.g. "0.10.7").
			version: string
			//+usage=Namespace to deploy the external-secrets operator into.
			namespace: *"external-secrets" | string
			//+usage=Install ESO CRDs via Helm. Set false only if CRDs are managed externally.
			installCRDs: *true | bool
			//+usage=Number of controller replicas.
			replicaCount: *1 | int
			//+usage=Webhook deployment configuration.
			webhook: *{} | {
				//+usage=Deploy the validating/mutating webhook. Disable for minimal installs.
				create: *true | bool
			}
			//+usage=Cert-controller deployment configuration.
			certController: *{} | {
				//+usage=Deploy the certificate controller. Required when webhook.create is true.
				create: *true | bool
			}
			//+usage=Prometheus ServiceMonitor configuration.
			serviceMonitor: *{enabled: false} | {
				enabled: bool
			}
		}

		//+usage=wasmCloud runtime provider. When enabled=true and name is set the
		//+usage=runtime-wasmcloud component is added to the Application's component list,
		//+usage=deploying the wasmcloud-operator Helm chart (OCI: ghcr.io/wasmcloud/charts)
		//+usage=and an optional WasmCloudHostConfig CR into the target namespace.
		wasmcloud: *{enabled: false} | {
			enabled:   bool
			//+usage=Component name — used as the OAM component name and in resource names.
			name:      string
			//+usage=Namespace to deploy the wasmcloud-operator HelmRelease into.
			namespace: *"wasmcloud" | string
			//+usage=Deployment target label (local | pre-prod | prod).
			target: *"local" | string
			//+usage=wasmcloud-operator Helm chart version to pin.
			chartVersion: *"0.1.7" | string
			//+usage=Optional WasmCloudHostConfig CR. When enabled, the operator spins up
			//+usage=wasmCloud host pods connected to the given NATS lattice.
			hostConfig: *{enabled: false} | {
				enabled:                   bool
				hostReplicas:              *1 | int
				lattice:                   *"default" | string
				natsAddress:               *"nats://nats.default.svc.cluster.local" | string
				version:                   *"" | string
				registryCredentialsSecret: *"" | string
			}
		}

		//+usage=Structured environment block. Chart assembly (base charts + external-dns
		//+usage=instance expansion) is derived entirely from this field.
		environment: {
			//+usage=cert-manager Helm chart configuration
			"cert-manager": *{enabled: false} | {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			//+usage=Trivy operator Helm chart configuration
			trivy: *{enabled: false} | {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			//+usage=KEDA autoscaler Helm chart configuration
			keda: *{enabled: false} | {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			//+usage=OpenTelemetry collector operator Helm chart configuration
			"otel-collector-operator": *{enabled: false} | {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			//+usage=Stakater Reloader Helm chart configuration
			reloader: *{enabled: false} | {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			//+usage=Headlamp Kubernetes web UI Helm chart configuration.
			//+usage=Chart: headlamp/headlamp — https://kubernetes-sigs.github.io/headlamp/
			headlamp: *{enabled: false} | {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			//+usage=Pulumi Kubernetes Operator Helm chart configuration.
			//+usage=Chart: pulumi-kubernetes-operator — https://pulumi.github.io/pulumi-kubernetes-operator
			//+usage=Deploys the operator that reconciles Pulumi stacks as Kubernetes custom resources.
			"pulumi-operator": *{enabled: false} | {
				enabled:     bool
				repo:        *"https://pulumi.github.io/pulumi-kubernetes-operator" | string
				version:     string
				namespace:   *"pulumi-system" | string
				releaseName: *"pulumi-operator" | string
				includeCRDs: *true | bool
			}

			//+usage=External DNS configuration. When enabled, each instance with
			//+usage=enabled: true is expanded to a separate Helm release keyed by
			//+usage=provider (e.g. "external-dns-cloudflare"). Instances with
			//+usage=enabled: false are skipped, allowing staged rollouts.
			"external-dns": *{
				enabled:   false
				repo:      "https://kubernetes-sigs.github.io/external-dns/"
				version:   "1.15.0"
				instances: []
			} | {
				enabled: bool
				repo:    string
				version: string
				instances: *[] | [...{
					//+usage=Whether this instance should be deployed. Defaults to true.
					enabled: *true | bool
					//+usage=DNS provider identifier (e.g. "cloudflare", "route53").
					//+usage=Drives releaseName ("external-dns-<provider>") and chart name.
					provider: string
					//+usage=Namespace to deploy this external-dns instance into.
					namespace: *"external-dns" | string
					//+usage=Optional domain filters for this provider instance.
					domains: *[] | [...string]
				}]
			}
		}

		//+usage=GitOps sync source configuration. url and ref are passed to the render
		//+usage=Job as REGISTRY_URL and TAG env vars. pullSecret names the Secret holding
		//+usage=.dockerconfigjson credentials for the in-cluster Harbor registry.
		gitopsConfig: *{
			type:       "flux"
			url:        "oci://harbor-core.harbor.svc.cluster.local/staccato/manifests"
			ref:        "latest"
			pullSecret: "harbor-oci-credentials"
		} | {
			type:       string
			url:        string
			ref:        string
			pullSecret: string
		}
	}
}
