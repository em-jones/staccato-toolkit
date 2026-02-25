"observability-lgtm": {
	description: "Deploys the all-in-one LGTM observability stack (grafana/otel-lgtm) as a single Deployment + Service. When target=local the image is pulled via the cluster-internal Harbor proxy cache and a Flux OCIRepository tracks the image artifact."
	type:        "component"
	attributes: workload: type: "autodetects.core.oam.dev"
}

template: {
	// Primary output: Deployment running the all-in-one grafana/otel-lgtm container.
	output: {
		apiVersion: "apps/v1"
		kind:       "Deployment"
		metadata: {
			name:      "lgtm-\(parameter.name)"
			namespace: parameter.namespace
			labels: {
				app:                          "lgtm"
				"st-environment/capability": "observability"
				"st-environment/name":       parameter.name
				"st-environment/target":     parameter.target
			}
		}
		spec: {
			replicas: 1
			selector: matchLabels: app: "lgtm"
			template: {
				metadata: labels: app: "lgtm"
				spec: {
					containers: [{
						name:  "lgtm"
						image: parameter.image
						ports: [
							{name: "grafana", ntainerPort: 3000},
							{name: "pyroscope", containerPort: 4040},
							{name: "otel-grpc", containerPort: 4317},
							{name: "otel-http", containerPort: 4318},
							{name: "prometheus", containerPort: 9090},
						]
						readinessProbe: exec: command: ["cat", "/tmp/ready"]
						volumeMounts: [
							{name: "tempo-data", Path: "/data/tempo"},
							{name: "grafana-data", ntPath: "/data/grafana"},
							{name: "loki-data", ath: "/data/loki"},
							{name: "loki-storage", ntPath: "/loki"},
							{name: "p8s-storage", tPath: "/data/prometheus"},
							{name: "pyroscope-storage", mountPath: "/data/pyroscope"},
						]
					}]
					volumes: [
						{name: "tempo-data",ir: {}},
						{name: "grafana-data",yDir: {}},
						{name: "loki-data",r: {}},
						{name: "loki-storage",yDir: {}},
						{name: "p8s-storage",Dir: {}},
						{name: "pyroscope-storage", emptyDir: {}},
					]
				}
			}
		}
	}

	outputs: {
		// Service exposes all LGTM endpoints within the cluster.
		"lgtm-service": {
			apiVersion: "v1"
			kind:       "Service"
			metadata: {
				name:      "lgtm-\(parameter.name)"
				namespace: parameter.namespace
				labels: {
					app:                          "lgtm"
					"st-environment/capability": "observability"
					"st-environment/name":       parameter.name
					"st-environment/target":     parameter.target
				}
			}
			spec: {
				selector: app: "lgtm"
				ports: [
					{name: "grafana",rt: 3000, targetPort: 3000},
					{name: "pyroscope",port: 4040, targetPort: 4040},
					{name: "otel-grpc",port: 4317, targetPort: 4317},
					{name: "otel-http",port: 4318, targetPort: 4318},
					{name: "prometheus", port: 9090, targetPort: 9090},
				]
			}
		}

		// OCIRepository tracks the grafana/otel-lgtm image artifact via Harbor
		// proxy cache. Only created for the local target.
		if parameter.target == "local" {
			"lgtm-oci-source": {
				apiVersion: "source.toolkit.fluxcd.io/v1beta2"
				kind:       "OCIRepository"
				metadata: {
					name:      "lgtm-\(parameter.name)"
					namespace: "flux-system"
					labels: {
						"st-environment/capability": "observability"
						"st-environment/name":       parameter.name
						"st-environment/target":     parameter.target
					}
				}
				spec: {
					interval: parameter.ociSource.interval
					url:      parameter.ociSource.url
					ref: tag: parameter.ociSource.ref
					if parameter.ociSource.pullSecret != "" {
						secretRef: name: parameter.ociSource.pullSecret
					}
				}
			}
		}
	}

	parameter: {
		//+usage=The environment name; used as a suffix on resource names.
		name: string

		//+usage=Deployment target. When "local" a Flux OCIRepository is created and the image is pulled via Harbor proxy cache.
		target: *"local" | "pre-prod" | "prod"

		//+usage=Namespace to deploy the lgtm Deployment and Service into.
		namespace: *"monitoring" | string

		//+usage=Container image for the all-in-one LGTM stack.
		// When target=local, set this to the Harbor proxy-cache URL,
		// e.g. "harbor-core.harbor.svc.cluster.local/proxy-cache/grafana/otel-lgtm:latest".
		image: *"grafana/otel-lgtm:latest" | string

		//+usage=OCIRepository source settings. Only used when target=local.
		ociSource: {
			//+usage=OCI URL of the grafana/otel-lgtm image artifact in Harbor proxy cache.
			url: *"oci://harbor-core.harbor.svc.cluster.local/proxy-cache/grafana/otel-lgtm" | string
			//+usage=Image tag to track.
			ref: *"latest" | string
			//+usage=Reconcile interval.
			interval: *"5m" | string
			//+usage=dockerconfigjson Secret name in flux-system for Harbor auth. Empty string skips secretRef.
			pullSecret: *"harbor-oci-credentials" | string
		}
	}
}
