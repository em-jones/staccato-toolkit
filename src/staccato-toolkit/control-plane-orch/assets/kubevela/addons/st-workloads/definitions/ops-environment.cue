"ops-environment": {
	description: "Opinionated environment component for the kubevela control plane cluster. Enables penpot, dev-portal, headlamp, trivy, casdoor SSO, hosted-lgtm observability, and reloader by default."
	type:        "component"
	attributes: workload: type: "autodetects.core.oam.dev"
}

template: {
	// Renders an OAM Application that wires the staccato-environment component with
	// ops-specific parameter defaults.
	//
	// staccato-environment owns the full render lifecycle:
	//   1. Creates the environment ConfigMap (kustomization.yaml + chart list).
	//   2. In dev mode: runs an in-cluster Job that calls `staccato bootstrap
	//      render-and-push`, building each Helm chart and pushing the combined
	//      manifests as an OCI artifact to Harbor. Harbor credentials come from
	//      the Secret named by gitopsConfig.pullSecret (.dockerconfigjson key).
	//
	// This template supplies only the ops-specific defaults (which services are on
	// by default, providers, etc.) and passes mode through.
	//
	// Non-dev rendering: omit mode or set it to any non-"dev" value. Trigger
	// `staccato bootstrap render-and-push` out-of-band (e.g. from the Taskfile:
	//   task dev:up:ops-environment).

	output: {
		apiVersion: "core.oam.dev/v1beta1"
		kind:       "Application"
		metadata: {
			name:      "env-\(parameter.name)"
			namespace: "vela-system"
			annotations: "app.oam.dev/description": "Ops environment: \(parameter.description)"
		}
		spec: {
			components: [{
				name: parameter.name
				type: "staccato-environment"
				properties: {
					name:        parameter.name
					description: parameter.description
					systems:     parameter.systems
					mode:        parameter.mode
					// Auth provider — casdoor by default for ops
					"auth-provider": parameter.providers["auth-provider"]

				// Observability — hosted-lgtm by default for ops
				"observability-lgtm": parameter.providers["observability-lgtm"]

					// Dev tooling (all on by default for ops)
					penpot:       parameter.environment.penpot
					"dev-portal": parameter.environment["dev-portal"]

					// Security
					trivy:             parameter.environment.trivy
					"external-secrets": parameter.environment["external-secrets"]

					// Ops services
					wasmcloud: parameter.environment.wasmcloud

					// Full environment block — staccato-environment assembles the chart
					// list (base charts + external-dns instance expansion) from this.
					environment: parameter.environment

					// GitOps sync — url and ref are passed to the render Job as
					// --registry-url and --tag; pullSecret names the Harbor credentials Secret.
					gitopsConfig: parameter.environment.gitopsConfig
				}
			}]

			workflow: steps: [{
				type: "apply-component"
				name: "apply-staccato-environment"
				properties: component: parameter.name
			}]
		}
	}

	parameter: {
		name: string
		description: *"Staccato control plane ops environment." | string
		systems: *[] | [...{}]

		//+usage=Render mode passed to staccato-environment. "dev" triggers an in-cluster
		//+usage=Job that builds and pushes manifests to Harbor immediately after the
		//+usage=ConfigMap is created. Any other value creates only the ConfigMap.
		mode: *"dev" | string

		providers: *{
			"auth-provider": *{
				enabled:   true
				type:      "auth-casdoor"
				name:      "ops"
				namespace: "casdoor"
			} | {...}
			"observability-lgtm": *{
				enabled:   true
				type:      "hosted-lgtm"
				name:      "ops"
				namespace: "monitoring"
			} | {...}
		} | {...}
		environment: {

			// _chartProps defines the schema shared by all renderable service properties.
			// Each renderable property carries its own Helm chart coordinates so that
			// chart versions are co-located with the service toggle in env.yaml.
			#chartProps: {
				enabled:     bool
				repo:        string
				version:     string
				namespace:   string
				releaseName: string
				includeCRDs: *false | bool
			}

			"cert-manager": *{
				enabled:     true
				repo:        "https://charts.jetstack.io"
				version:     "v1.17.1"
				namespace:   "cert-manager"
				releaseName: "cert-manager"
				includeCRDs: true
			} | #chartProps

			"otel-collector-operator": *{
				enabled:     true
				repo:        "https://open-telemetry.github.io/opentelemetry-helm-charts"
				version:     "0.78.0"
				namespace:   "opentelemetry-operator-system"
				releaseName: "opentelemetry-operator"
				includeCRDs: true
			} | #chartProps
			headlamp: *{
				enabled:     true
				repo:        "https://kubernetes-sigs.github.io/headlamp/"
				version:     "0.40.1"
				namespace:   "headlamp"
				releaseName: "headlamp"
				includeCRDs: false
			} | #chartProps
			//+usage=Penpot Helm chart configuration (chart: penpot, repo: https://helm.penpot.app).
			penpot: *{enabled: true} | {
				enabled: bool
				config: {
					publicUri:    *"http://localhost:3000" | string
					flags:        *"enable-registration enable-login-with-password disable-email-verification disable-secure-session-cookies" | string
					apiSecretKey: string
					postgresql: *{} | {
						host:     *"" | string
						username: *"penpot" | string
						password: string
						database: *"penpot" | string
					}
				}
				global: *{} | {
					postgresqlEnabled: *true | bool
				}
				ingress: *{enabled: false} | {
					enabled: bool
				}
			}
			"dev-portal": *{enabled: true} | {enabled: bool}
			trivy: *{
				enabled:     true
				repo:        "https://aquasecurity.github.io/helm-charts"
				version:     "v0.27.3"
				namespace:   "trivy-system"
				releaseName: "trivy-operator"
				includeCRDs: true
			} | #chartProps
			//+usage=external-secrets operator Helm chart configuration
			//+usage=(chart: external-secrets, repo: https://charts.external-secrets.io).
			"external-secrets": *{enabled: false} | {
				enabled:     bool
				releaseName: *"external-secrets" | string
				version:     string
				namespace:   *"external-secrets" | string
				installCRDs: *true | bool
				replicaCount: *1 | int
				webhook: *{} | {
					create: *true | bool
				}
				certController: *{} | {
					create: *true | bool
				}
				serviceMonitor: *{enabled: false} | {
					enabled: bool
				}
			}
			reloader: *{
				enabled:     true
				repo:        "https://stakater.github.io/stakater-charts"
				version:     "1.4.0"
				namespace:   "reloader"
				releaseName: "reloader"
				includeCRDs: false
			} | #chartProps
			keda: *{
				enabled:     false
				repo:        "https://kedacore.github.io/charts"
				version:     "2.17.0"
				namespace:   "keda"
				releaseName: "keda"
				includeCRDs: false
			} | #chartProps
			wasmcloud: *{enabled: false} | {enabled: bool}

			// external-dns: when enabled, each instance with enabled: true is rendered
			// as a separate Helm chart release by staccato-environment. The shared repo
			// and version apply to every instance; each instance specifies its own provider
			// (used to derive releaseName and name) and target namespace. Instances with
			// enabled: false are skipped, allowing staged rollouts without removing entries.
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
					//+usage=Whether this instance should be deployed. Defaults to true so
					//+usage=existing entries are active; set false to stage a rollout pause.
					enabled: *true | bool
					//+usage=DNS provider identifier (e.g. "cloudflare", "route53"). Drives
					//+usage=the releaseName ("external-dns-<provider>") and chart name.
					provider: string
					//+usage=Namespace to deploy this external-dns instance into.
					namespace: *"external-dns" | string
					//+usage=Optional list of domain filters for this provider instance.
					domains: *[] | [...string]
				}]
			}

			gitopsConfig: {
				type: *"flux" | string
				url: string
				ref: *"latest" | string
				pullSecret: *"harbor-oci-credentials" | string
			}
		}
	}
}
