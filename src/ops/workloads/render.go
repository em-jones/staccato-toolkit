package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// validEnvs is the set of accepted environment values for the Render function.
var validEnvs = map[string]bool{
	"local":   true,
	"dev":     true,
	"staging": true,
	"prod":    true,
}

// helmChart represents a single entry from the kustomization.yaml helmCharts list.
type helmChart struct {
	Name        string `json:"name"`
	Repo        string `json:"repo"`
	Version     string `json:"version"`
	Namespace   string `json:"namespace"`
	ReleaseName string `json:"releaseName"`
	IncludeCRDs bool   `json:"includeCRDs"`
}

// chartResult holds the rendered output for a single chart.
type chartResult struct {
	chart helmChart
	yaml  string
}

// Render reads kustomizationDir/kustomization.yaml, extracts each helmCharts entry,
// runs `kustomize build --enable-helm` per chart, then pushes each chart's rendered
// manifests as an OCI artifact to the target Harbor registry.
//
// The kustomization.yaml is the same format emitted by the staccato-environment OAM component
// into the cluster ConfigMap (data["kustomization.yaml"]). It can be provided directly
// from source or extracted from the ConfigMap before calling this function.
//
// OCI artifact URL per chart:
//
//	<registryURL>/<chart.name>:<env>-<sha>
//
// e.g. oci://harbor-core.harbor.svc.cluster.local/staccato/manifests/flux-operator:dev-abc1234
//
// Atomicity: ALL charts are rendered before any push. A render failure leaves
// nothing pushed. Push failures abort the sequence and return an error.
//
// sha is used verbatim as the version component in OCI tags. In CI it is the git
// commit short SHA; in-cluster it is the gitopsConfig.ref value from the OAM Application.
//
// sourceURL is the provenance URL embedded in the OCI artifact metadata via
// `flux push artifact --source`. Defaults to "unknown" when not provided.
//
// Usage (local):
//
//	dagger call render \
//	    --kustomization-dir ./envs/ops/ \
//	    --env local \
//	    --registry-url oci://harbor:5000/staccato/manifests \
//	    --sha abc1234
//
// Usage (CI):
//
//	dagger call render \
//	    --kustomization-dir ./envs/ops/ \
//	    --env dev \
//	    --registry-url oci://harbor-core.harbor.svc.cluster.local/staccato/manifests \
//	    --sha $GIT_SHA \
//	    --source-url https://github.com/em-jones/staccato-toolkit \
//	    --registry-credentials env:DOCKER_CONFIG_JSON
func (m *Platform) Render(
	ctx context.Context,
	kustomizationDir *Directory,
	env string,
	registryURL string,
	sha string,
	// +optional
	sourceURL string,
	// +optional
	registryCredentials *Secret,
) (string, error) {
	if !validEnvs[env] {
		return "", fmt.Errorf("render: invalid env %q — must be one of: local, dev, staging, prod", env)
	}
	if registryURL == "" {
		return "", fmt.Errorf("render: registryURL is required")
	}
	if sha == "" {
		return "", fmt.Errorf("render: sha is required — pass the git commit SHA or gitopsConfig.ref value")
	}
	if sourceURL == "" {
		sourceURL = "unknown"
	}

	// Parse helmCharts entries from kustomization.yaml using yq.
	charts, err := m.parseHelmCharts(ctx, kustomizationDir)
	if err != nil {
		return "", fmt.Errorf("render: %w", err)
	}

	// Phase 1: render all charts before any push (atomicity guarantee).
	results := make([]chartResult, 0, len(charts))
	for _, chart := range charts {
		yaml, buildErr := m.kustomizeBuild(ctx, chart)
		if buildErr != nil {
			return "", fmt.Errorf("render: kustomize build failed for chart %q: %w", chart.Name, buildErr)
		}
		results = append(results, chartResult{chart: chart, yaml: yaml})
	}

	// Phase 2: push each chart's rendered output to Harbor.
	var pushed []string
	for _, r := range results {
		artifactURL := fmt.Sprintf("%s/%s:%s-%s", registryURL, r.chart.Name, env, sha)
		digest, pushErr := m.pushOCIArtifact(
			ctx,
			renderResult{name: r.chart.Name, yaml: r.yaml},
			artifactURL, sha, sourceURL,
			registryCredentials,
		)
		if pushErr != nil {
			return "", fmt.Errorf("render: OCI push failed for chart %q: %w", r.chart.Name, pushErr)
		}
		pushed = append(pushed, digest)
	}

	return strings.Join(pushed, "\n"), nil
}

// parseHelmCharts extracts the helmCharts list from kustomizationDir/kustomization.yaml
// using yq. Returns an error if the file is missing, malformed, or has no charts.
//
// yq is invoked via the mikefarah/yq:4 container image. The kustomization.yaml may be
// in YAML or JSON format (both are accepted by yq and kustomize).
func (m *Platform) parseHelmCharts(ctx context.Context, kustomizationDir *Directory) ([]helmChart, error) {
	chartsJSON, err := dag.Container().
		From("mikefarah/yq:4").
		WithMountedDirectory("/kustomization", kustomizationDir).
		WithWorkdir("/kustomization").
		WithExec([]string{"yq", ".helmCharts", "kustomization.yaml", "-o=json"}).
		Stdout(ctx)
	if err != nil {
		return nil, fmt.Errorf("yq failed to parse kustomization.yaml: %w", err)
	}

	chartsJSON = strings.TrimSpace(chartsJSON)
	if chartsJSON == "" || chartsJSON == "null" {
		return nil, fmt.Errorf("kustomization.yaml contains no helmCharts entries")
	}

	var charts []helmChart
	if err := json.Unmarshal([]byte(chartsJSON), &charts); err != nil {
		return nil, fmt.Errorf("failed to unmarshal helmCharts JSON: %w", err)
	}
	if len(charts) == 0 {
		return nil, fmt.Errorf("kustomization.yaml helmCharts list is empty")
	}

	// Default releaseName to chart name when not specified.
	for i := range charts {
		if charts[i].ReleaseName == "" {
			charts[i].ReleaseName = charts[i].Name
		}
	}
	return charts, nil
}

// kustomizeBuild creates a single-chart kustomization directory and runs
// `kustomize build --enable-helm` against it, returning the rendered YAML.
//
// A per-chart kustomization.yaml is created in-memory (via dag.Directory().WithNewFile)
// to isolate each chart's output. This allows each chart to be pushed as a separate
// OCI artifact without YAML stream splitting.
//
// The build container installs helm v3 and kustomize v5.3.0 from their official
// release tarballs. Dagger caches this installation layer across invocations.
func (m *Platform) kustomizeBuild(ctx context.Context, chart helmChart) (string, error) {
	// Build a JSON kustomization (valid YAML) for this single chart.
	kustomizationData := struct {
		APIVersion string      `json:"apiVersion"`
		Kind       string      `json:"kind"`
		HelmCharts []helmChart `json:"helmCharts"`
	}{
		APIVersion: "kustomize.config.k8s.io/v1beta1",
		Kind:       "Kustomization",
		HelmCharts: []helmChart{chart},
	}
	kustomizationJSON, err := json.Marshal(kustomizationData)
	if err != nil {
		return "", fmt.Errorf("marshal single-chart kustomization: %w", err)
	}

	// Create an in-memory directory with the kustomization.yaml for this chart.
	// dag.Directory().WithNewFile avoids shell quoting issues when passing YAML/JSON content.
	chartDir := dag.Directory().WithNewFile("kustomization.yaml", string(kustomizationJSON))

	out, err := m.kustomizeContainer().
		WithMountedDirectory("/chart", chartDir).
		WithExec([]string{"kustomize", "build", "--enable-helm", "/chart"}).
		Stdout(ctx)
	if err != nil {
		return "", fmt.Errorf("kustomize build chart=%q repo=%q version=%q: %w",
			chart.Name, chart.Repo, chart.Version, err)
	}
	return out, nil
}

// kustomizeContainer returns a container with helm v3 and kustomize v5.3.0 installed.
// Structured as a single cached layer to minimise reinstalls across Dagger invocations.
func (m *Platform) kustomizeContainer() *dagContainer {
	return dag.Container().
		From("alpine:latest").
		WithExec([]string{"sh", "-c",
			"apk add --no-cache curl tar && " +
				// helm v3
				"curl -fsSL https://get.helm.sh/helm-v3.15.0-linux-amd64.tar.gz | tar xz --strip=1 -C /usr/local/bin linux-amd64/helm && " +
				// kustomize v5.3.0 (matches devbox version)
				"curl -fsSL 'https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz' | tar xz -C /usr/local/bin"})
}

// renderResult holds the rendered output for OCI push (shared with pushOCIArtifact).
type renderResult struct {
	name string
	yaml string
}

// pushOCIArtifact pushes the rendered YAML for a single component/chart to the OCI registry
// using flux push artifact. Returns the pushed artifact reference string.
//
// Flux embeds provenance metadata (--source, --revision) that Flux OCIRepository verifies.
// sourceURL is the git remote or source identifier embedded in the artifact metadata.
// registryCredentials (optional Docker config JSON) is injected as DOCKER_CONFIG_JSON.
func (m *Platform) pushOCIArtifact(
	ctx context.Context,
	r renderResult,
	artifactURL string,
	sha string,
	sourceURL string,
	registryCredentials *Secret,
) (string, error) {
	// Write rendered YAML to an in-memory directory, then call flux push artifact.
	// Using dag.Directory().WithNewFile avoids shell quoting of the YAML content.
	manifestDir := dag.Directory().WithNewFile("manifest.yaml", r.yaml)

	ctr := dag.Container().
		From("ghcr.io/fluxcd/flux-cli:v2").
		WithMountedDirectory("/manifests", manifestDir)

	if registryCredentials != nil {
		ctr = ctr.WithSecretVariable("DOCKER_CONFIG_JSON", registryCredentials)
	}

	out, err := ctr.
		WithExec([]string{
			"flux", "push", "artifact", artifactURL,
			"--path=/manifests",
			"--source=" + sourceURL,
			"--revision=" + sha,
		}).
		Stdout(ctx)
	if err != nil {
		return "", fmt.Errorf("flux push artifact %s: %w", artifactURL, err)
	}
	return strings.TrimSpace(out), nil
}
