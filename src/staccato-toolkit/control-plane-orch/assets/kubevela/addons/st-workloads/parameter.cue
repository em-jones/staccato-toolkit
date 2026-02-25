// parameter.cue defines the configurable parameters for the st-environment addon.
//
// Enable with overrides:
//   vela addon enable ./addons/st-environment \
//     --set name=prod \
//     --set target=prod \
//     --set gitopsConfig.type=flux \
//     --set gitopsConfig.version=2.x \
//     --set gitopsConfig.registry=ghcr.io/fluxcd \
//     --set gitopsConfig.artifact=oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests
parameter: {
	// name is the environment name (e.g. "local", "staging", "prod").
	// Used to label ResourceSets and as the FluxInstance name suffix.
	name: string

	// capabilities enables platform-wide services. Each enabled capability creates a
	// GitRepository in the flux-system namespace pointing at a path within the shared
	// config repo (configured by gitopsConfig).
	capabilities: {
		// certManager enables cert-manager GitRepository registration.
		certManager: *false | bool
		// externalSecrets enables external-secrets-operator GitRepository registration.
		externalSecrets: *false | bool
		// observability enables the observability stack GitRepository registration.
		observability: *false | bool
		// reloader enables Stakater Reloader GitRepository registration.
		reloader: *false | bool
		// domains is a list of DNS domain records for this environment.
		// Each domain has a name and a visibility type.
		domains: *[] | [...{
			name: string
			type: "public" | "private"
		}]
	}

	// gitopsConfig configures the GitOps sync source for the FluxInstance and capability
	// GitRepositories.
	gitopsConfig: {
		// type is the GitOps engine. Only "flux" is supported.
		type: "flux"
		// version is the Flux distribution version constraint (e.g. "2.x").
		version: *"2.x" | string
		// registry is the Flux controller image registry (e.g. "ghcr.io/fluxcd").
		registry: *"ghcr.io/fluxcd" | string
		// artifact is the OCI URL of the Flux operator manifests artifact used by FluxInstance.
		artifact: *"oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests" | string
		// url is the OCI or Git URL Flux will reconcile from (used in FluxInstance sync.url).
		url: string
		// ref is the tag or branch Flux will track (e.g. "latest").
		ref: *"latest" | string
		// pullSecret is the name of the dockerconfigjson Secret in flux-system for auth.
		pullSecret: *"harbor-oci-credentials" | string
		// configRepoURL is the Git repository URL used for capability GitRepository sources.
		configRepoURL: string
		// configRepoBranch is the branch of the config repo to track.
		configRepoBranch: *"main" | string
	}

	// target is the deployment target class for this environment.
	target: "local" | "pre-prod" | "prod"

	// systems is the list of systems to register as Flux ResourceSets.
	// Each system has a name and a list of raw Kubernetes resource objects that
	// populate the ResourceSet's resources field verbatim.
	systems: *[] | [...{
		// name is the system identifier (e.g. "staccato", "monitoring").
		name: string
		// components is the list of raw Kubernetes manifest objects placed into the
		// ResourceSet resources field for this system.
		components: [...{}]
	}]
}
