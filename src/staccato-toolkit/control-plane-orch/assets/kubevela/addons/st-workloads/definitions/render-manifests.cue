import (
	"vela/op"
)

// render-manifests is a KubeVela WorkflowStepDefinition that renders Helm charts
// from a ConfigMap-mounted kustomization.yaml and pushes OCI artifacts to Harbor.
//
// Mode: "local" (default) vs "production"
//
//   local mode:
//     This WorkflowStep is NOT used. Run `staccato bootstrap render-and-push` from
//     the Taskfile instead (see dev:up:ops-environment). The CLI fetches the ConfigMap,
//     runs `kustomize build --enable-helm`, and pushes directly to Harbor.
//     No GitHub egress is required in local mode.
//
//   production mode (deferred — not yet implemented):
//     This step creates a batch/v1 Job in vela-system. The Job runs the Dagger CLI,
//     which fetches the staccato-toolkit Dagger module from GitHub and invokes the
//     `render` function to build and push OCI artifacts.
//
//     Network requirements (production mode only):
//       - Job Pod must have egress to github.com (Dagger module resolution)
//       - github.com/em-jones/staccato-toolkit is a PUBLIC repository
//       - Job Pod must have egress to upstream Helm chart repositories
//
//     TODO(production): implement the git → Harbor proxy path:
//       1. Push rendered manifests to a git repository instead of directly to Harbor
//       2. Flux's OCIRepository source pulls from Harbor acting as a proxy for the git repo
//       This allows airgapped clusters to consume manifests from Harbor without direct
//       git access. Deferred until local mode is validated end-to-end.
//
// Required cluster secrets (pre-created by harbor-core initContainer during bootstrap):
//   - harbor-oci-credentials (flux-system ns, key: .dockerconfigjson)
//
// Required cluster secrets (pre-created manually for production mode):
//   - dagger-cloud-token (vela-system ns, key: token) — Dagger Cloud engine auth
//
// The ConfigMap named by configMapName must exist before this step runs. Use an
// apply-component step (applying the staccato-environment component) before this step
// in the Application workflow.
"render-manifests": {
	type:        "workflow-step"
	description: "Production mode: renders Helm charts via dagger call render in a Kubernetes Job. Mounts kustomization.yaml from a ConfigMap and pushes OCI artifacts to Harbor. Not used in local mode — see staccato bootstrap render-and-push."
}

template: {
	parameter: {
		// mode controls whether this step runs and which render path is used.
		//   "local"      — step is a no-op; use staccato bootstrap render-and-push instead.
		//   "production" — creates a Kubernetes Job using the Dagger Cloud pipeline.
		//
		// TODO(production): when mode=="local" the step should be a no-op (op.#Noop or
		// equivalent). Until CUE/KubeVela supports conditional step skipping natively,
		// the ops-environment.cue workflow simply omits this step in local mode.
		mode: *"local" | "production"

		configMapName: string
		env: string
		registryURL: string
		sha: string
		pullSecret: *"harbor-oci-credentials" | string
		image: *"ghcr.io/dagger/dagger:v0.19.11" | string
	}

	_jobName: "render-\(parameter.env)-\(context.name)"

	// Production mode: create a Kubernetes Job that runs the Dagger render pipeline.
	// Local mode: this step should not be included in the workflow (see ops-environment.cue).
	//
	// TODO(production): add a CUE conditional guard once KubeVela supports conditional
	// workflow steps natively, e.g.:
	//   if parameter.mode == "production" { apply: op.#Apply & { ... } }
	apply: op.#Apply & {
		value: {
			apiVersion: "batch/v1"
			kind:       "Job"
			metadata: {
				name:      _jobName
				namespace: "vela-system"
				labels: {
					"app.oam.dev/component": parameter.env
					"st-environment/render": "true"
					"st-environment/sha":    parameter.sha
					"st-environment/mode":   parameter.mode
				}
			}
			spec: {
				backoffLimit: 2
				template: spec: {
					restartPolicy: "Never"
					containers: [{
						name:  "dagger"
						image: parameter.image
						command: [
							"dagger", "call",
							// Network requirement (production mode): the Job Pod must have
							// egress to github.com for Dagger to resolve this module.
							// github.com/em-jones/staccato-toolkit is a PUBLIC repository.
							//
							// TODO(production): replace with a pre-pushed module in Harbor
							// or Dagger Cloud cache to eliminate GitHub dependency.
							"--mod", "github.com/em-jones/staccato-toolkit/src/ops/workloads",
							"render",
							"--kustomization-dir", "/kustomization",
							"--env", parameter.env,
							"--registry-url", parameter.registryURL,
							"--sha", parameter.sha,
							"--registry-credentials", "env:DOCKER_CONFIG_JSON",
						]
						env: [
							{
								name: "DAGGER_CLOUD_TOKEN"
								valueFrom: secretKeyRef: {
									name: "dagger-cloud-token"
									key:  "token"
								}
							},
							{
								name: "DOCKER_CONFIG_JSON"
								valueFrom: secretKeyRef: {
									name: parameter.pullSecret
									key:  ".dockerconfigjson"
								}
							},
						]
						volumeMounts: [{
							name:      "kustomization"
							mountPath: "/kustomization"
							readOnly:  true
						}]
					}]
					volumes: [{
						name: "kustomization"
						configMap: {
							name: parameter.configMapName
							items: [{
								key:  "kustomization.yaml"
								path: "kustomization.yaml"
							}]
						}
					}]
				}
			}
		}
	}

	readStatus: op.#Read & {
		value: {
			apiVersion: "batch/v1"
			kind:       "Job"
			metadata: {
				name:      _jobName
				namespace: "vela-system"
			}
		}
	}

	wait: op.#ConditionalWait & {
		continue: (readStatus.value.status != _|_) && (readStatus.value.status.succeeded != _|_) && (readStatus.value.status.succeeded >= 1)
	}
}
