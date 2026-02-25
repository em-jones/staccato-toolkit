"auth-casdoor": {
	description: "Deploys Casdoor (open-source SSO/IAM) via the community Helm chart. MVP uses SQLite backend; switch database.driver to postgres for production."
	type:        "component"
	attributes: workload: type: "autodetects.core.oam.dev"
}

template: {
	// Primary output: HelmRelease for Casdoor.
	output: {
		apiVersion: "helm.toolkit.fluxcd.io/v2beta1"
		kind:       "HelmRelease"
		metadata: {
			name:      "casdoor-\(parameter.name)"
			namespace: parameter.namespace
			labels: {
				"st-environment/capability": "auth"
				"st-environment/name":       parameter.name
				"st-environment/target":     parameter.target
			}
		}
		spec: {
			interval: "5m"
			chart: spec: {
				chart:   "casdoor"
				version: parameter.chartVersion
				sourceRef: {
					kind:      "HelmRepository"
					name:      "casdoor-community"
					namespace: parameter.namespace
				}
			}
			values: {
				replicaCount: parameter.replicas
				image: {
					repository: "casbin/casdoor"
					tag:        parameter.imageTag
				}
				// Database configuration — SQLite by default (no external dep for MVP).
				// Override database.driver=postgres + dataSourceName for production.
				config: {
					driverName:     parameter.database.driver
					dataSourceName: parameter.database.dataSourceName
				}
				service: {
					type: "ClusterIP"
					port: 8000
				}
				if parameter.ingress.enabled {
					ingress: {
						enabled: true
						hosts: [{
							host: parameter.ingress.host
							paths: [{path: "/", pathType: "Prefix"}]
						}]
					}
				}
				if !parameter.ingress.enabled {
					ingress: enabled: false
				}
			}
		}
	}

	outputs: {
		// HelmRepository pointing to the community casdoor chart.
		"casdoor-helmrepo": {
			apiVersion: "source.toolkit.fluxcd.io/v1beta2"
			kind:       "HelmRepository"
			metadata: {
				name:      "casdoor-community"
				namespace: parameter.namespace
				labels: {
					"st-environment/capability": "auth"
					"st-environment/name":       parameter.name
				}
			}
			spec: {
				interval: "1h"
				url:      "https://krzwiatrzyk.github.io/charts/"
			}
		}
	}

	parameter: {
		//+usage=Environment name suffix — used in resource names.
		name: string

		//+usage=Deployment target (informational label).
		target: *"local" | "pre-prod" | "prod"

		//+usage=Namespace to deploy Casdoor into.
		namespace: *"casdoor" | string

		//+usage=Casdoor container image tag.
		imageTag: *"latest" | string

		//+usage=Casdoor community Helm chart version to pin.
		chartVersion: *"1.0.0" | string

		//+usage=Number of Casdoor replicas.
		replicas: *1 | int

		//+usage=Database backend configuration.
		database: {
			//+usage=Database driver. Use sqlite3 for MVP; postgres for production.
			driver: *"sqlite3" | "postgres" | "mysql"
			//+usage=DSN string. Default uses a local SQLite file — no external DB needed.
			dataSourceName: *"file:casdoor.db?cache=shared&mode=memory" | string
		}

		//+usage=Ingress configuration for Casdoor.
		ingress: {
			//+usage=Enable Ingress resource creation.
			enabled: *false | bool
			//+usage=Hostname for the Ingress rule (required when enabled=true).
			host: *"casdoor.local" | string
		}
	}
}
