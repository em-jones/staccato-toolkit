package core

import "embed"

// BootstrapAssets contains all embedded bootstrap assets used by the staccato CLI.
// Assets are organized into:
//   - bootstrap/ — KubeVela Application manifests, FluxInstance config, devbox config
//
// Harbor and the flux-operator are deployed via the st-workloads KubeVela addon
// (control-plane-orch/assets/kubevela/addons/st-workloads), not as embedded addons.
//
//go:embed assets/bootstrap
var BootstrapAssets embed.FS
