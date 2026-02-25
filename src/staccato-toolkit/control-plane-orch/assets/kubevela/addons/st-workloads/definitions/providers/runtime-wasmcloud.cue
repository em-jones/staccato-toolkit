"runtime-wasmcloud": {
	description: "Deploys the wasmcloud-operator (Kubernetes operator for WasmCloudHostConfig CRDs) and an optional WasmCloudHostConfig instance via Flux HelmRelease + HelmRepository. Requires a NATS cluster with JetStream enabled to be reachable from the target namespace."
	type:        "component"
	attributes: workload: type: "autodetects.core.oam.dev"
}

template: {
	// Primary output: HelmRelease for the wasmcloud-operator.
	output: {
		apiVersion: "helm.toolkit.fluxcd.io/v2beta1"
		kind:       "HelmRelease"
		metadata: {
			name:      "wasmcloud-operator-\(parameter.name)"
			namespace: parameter.namespace
			labels: {
				"st-environment/capability": "runtime"
				"st-environment/name":       parameter.name
				"st-environment/target":     parameter.target
			}
		}
		spec: {
			interval: "5m"
			chart: spec: {
				chart:   "wasmcloud-operator"
				version: parameter.chartVersion
				sourceRef: {
					kind:      "HelmRepository"
					name:      "wasmcloud-operator"
					namespace: parameter.namespace
				}
			}
			// Values are intentionally minimal — the operator's own defaults are sensible.
			// Override via parameter.values for custom image, resources, etc.
			values: parameter.values
		}
	}

	outputs: {
		// HelmRepository pointing at the wasmCloud OCI chart registry.
		"wasmcloud-operator-helmrepo": {
			apiVersion: "source.toolkit.fluxcd.io/v1beta2"
			kind:       "HelmRepository"
			metadata: {
				name:      "wasmcloud-operator"
				namespace: parameter.namespace
				labels: {
					"st-environment/capability": "runtime"
					"st-environment/name":       parameter.name
				}
			}
			spec: {
				interval: "1h"
				// OCI-based Helm repository; requires Flux source-controller >= v0.26.
				type: "oci"
				url:  "oci://ghcr.io/wasmcloud/charts"
			}
		}

		// Optional: a WasmCloudHostConfig that tells the operator to spin up
		// wasmCloud host pods. Only emitted when hostConfig.enabled is true.
		if parameter.hostConfig.enabled {
			"wasmcloud-host-config": {
				apiVersion: "k8s.wasmcloud.dev/v1alpha1"
				kind:       "WasmCloudHostConfig"
				metadata: {
					name:      "wasmcloud-\(parameter.name)"
					namespace: parameter.namespace
					labels: {
						"st-environment/capability": "runtime"
						"st-environment/name":       parameter.name
						"st-environment/target":     parameter.target
					}
				}
				spec: {
					hostReplicas: parameter.hostConfig.hostReplicas
					lattice:      parameter.hostConfig.lattice
					natsAddress:  parameter.hostConfig.natsAddress
					if parameter.hostConfig.version != "" {
						version: parameter.hostConfig.version
					}
					if parameter.hostConfig.registryCredentialsSecret != "" {
						registryCredentialsSecret: parameter.hostConfig.registryCredentialsSecret
					}
				}
			}
		}
	}

	parameter: {
		//+usage=Environment name suffix — used in resource names.
		name: string

		//+usage=Deployment target (informational label).
		target: *"local" | "pre-prod" | "prod"

		//+usage=Namespace to deploy the wasmcloud-operator HelmRelease into.
		namespace: *"wasmcloud" | string

		//+usage=wasmcloud-operator Helm chart version to pin.
		//+usage=See https://github.com/wasmCloud/wadm-operator/releases for available versions.
		chartVersion: *"0.1.7" | string

		//+usage=Additional Helm values forwarded to the wasmcloud-operator chart.
		//+usage=Use to override image, resources, or operator-specific settings.
		values: *{} | {...}

		//+usage=Optional WasmCloudHostConfig to provision alongside the operator.
		//+usage=When enabled, a WasmCloudHostConfig CR is created in the same namespace.
		//+usage=Requires a reachable NATS cluster with JetStream enabled.
		hostConfig: *{
			enabled: false
		} | {
			enabled: bool
			//+usage=Number of wasmCloud host pods to run.
			hostReplicas: *1 | int
			//+usage=NATS lattice name to join.
			lattice: *"default" | string
			//+usage=NATS server address (e.g. "nats://nats.default.svc.cluster.local").
			natsAddress: *"nats://nats.default.svc.cluster.local" | string
			//+usage=wasmCloud host image version to run (e.g. "1.0.4"). Defaults to operator-managed.
			version: *"" | string
			//+usage=Name of a kubernetes.io/dockerconfigjson Secret for pulling private components.
			registryCredentialsSecret: *"" | string
		}
	}
}
