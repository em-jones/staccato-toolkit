package main

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/spf13/cobra"
)

// newBootstrapCmd returns the root `staccato bootstrap` command group.
func newBootstrapCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "bootstrap",
		Short: "Bootstrap the staccato platform onto a kind cluster",
		Long: `Bootstrap provisions the full staccato platform control plane onto a prepared kind cluster.

Run 'staccato bootstrap init' to perform the full bootstrap sequence:
  Phase 3a: Install KubeVela core + st-workloads addon via the st-workloads-bootstrap Helm chart
            (deploys Harbor, flux-operator, Reflector, and the harbor-oci-credentials Secret)
  Phase 3b: Render platform chart manifests and push OCI artifact to Harbor
  Phase 3c: Apply the gitops-provider OAM Application

Prerequisites (performed by the cluster provisioner, not this command):
  Phase 1: kind create cluster (kind cluster running)
  Phase 2: vela addon enable velaux (KubeVela UI installed)`,
	}

	cmd.AddCommand(newBootstrapInitCmd())
	cmd.AddCommand(newBootstrapRenderAndPushCmd())

	return cmd
}

// newBootstrapInitCmd returns the `staccato bootstrap init` command.
func newBootstrapInitCmd() *cobra.Command {
	var (
		chart               string
		helmRelease         string
		helmNamespace       string
		harborAdminPassword string
		appManifest         string
		env                 string
		registryURL         string
	)

	cmd := &cobra.Command{
		Use:   "init",
		Short: "Run the full GitOps bootstrap sequence (Phase 3a–3c)",
		Long: `init runs the three-step GitOps bootstrap sequence:

  Phase 3a: helm upgrade --install st-workloads-bootstrap <chart>
            Installs KubeVela core + st-workloads addon (Harbor, flux-operator,
            Reflector, harbor-oci-credentials) via the st-workloads-bootstrap Helm chart.
            The chart's post-install Job runs 'vela addon enable' automatically.

  Phase 3b: staccato bootstrap render-and-push
            Render chart manifests via kustomize, push as OCI artifact to Harbor.

  Phase 3c: kubectl apply -f gitops-provider-app.yaml
            Apply the gitops-provider OAM Application to activate GitOps reconciliation.

Harbor credentials (harbor-oci-credentials) are shipped declaratively by the addon and
reflected into all namespaces automatically by Reflector.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runBootstrapInit(cmd, chart, helmRelease, helmNamespace, harborAdminPassword, appManifest, env, registryURL)
		},
	}

	cmd.Flags().StringVar(&chart, "chart",
		"charts/st-workloads-bootstrap",
		"Path or OCI reference to the st-workloads-bootstrap Helm chart")
	cmd.Flags().StringVar(&helmRelease, "helm-release",
		"st-workloads-bootstrap",
		"Helm release name for the st-workloads-bootstrap chart")
	cmd.Flags().StringVar(&helmNamespace, "helm-namespace",
		"vela-system",
		"Kubernetes namespace to install the Helm release into")
	cmd.Flags().StringVar(&harborAdminPassword, "harbor-admin-password",
		"Harbor12345",
		"Harbor admin password (passed to the chart as harbor.adminPassword)")
	cmd.Flags().StringVar(&appManifest, "app-manifest", "assets/bootstrap/gitops-provider-app.yaml",
		"Path to the gitops-provider OAM Application manifest")
	cmd.Flags().StringVar(&env, "env", "ops",
		"Environment name — matches the ConfigMap created by the staccato-environment component (e.g. 'ops')")
	cmd.Flags().StringVar(&registryURL, "registry-url",
		"oci://harbor-core.harbor.svc.cluster.local/staccato/manifests",
		"OCI registry URL to push rendered manifests to")

	return cmd
}

func runBootstrapInit(cmd *cobra.Command, chart, helmRelease, helmNamespace, harborAdminPassword, appManifest, env, registryURL string) error {
	// Phase 3a: Install KubeVela core + st-workloads addon via Helm chart.
	// The chart's post-install Job automatically runs `vela addon enable` for the
	// st-workloads addon (Harbor, flux-operator, Reflector, harbor-oci-credentials).
	cmd.Printf("Phase 3a: Installing st-workloads-bootstrap chart from %s...\n", chart)
	if err := runCmd(cmd, "helm", "upgrade", "--install", helmRelease, chart,
		"--create-namespace",
		"--namespace", helmNamespace,
		"--set", fmt.Sprintf("harbor.adminPassword=%s", harborAdminPassword),
		"--wait",
		"--timeout", "10m",
	); err != nil {
		return fmt.Errorf("phase 3a: helm upgrade --install %s: %w", helmRelease, err)
	}
	cmd.Println("Phase 3a: KubeVela core + st-workloads addon installed ✓")

	// Phase 3b: Render chart manifests and push to Harbor
	cmd.Println("Phase 3b: Rendering platform manifests and pushing OCI artifact to Harbor...")
	if err := runRenderAndPush(cmd, env, registryURL, "latest"); err != nil {
		return fmt.Errorf("phase 3b: render-and-push: %w", err)
	}
	cmd.Println("Phase 3b: OCI artifact pushed ✓")

	// Phase 3c: Apply gitops-provider Application
	cmd.Printf("Phase 3c: Applying gitops-provider Application from %s...\n", appManifest)
	if err := runCmd(cmd, "kubectl", "apply", "-f", appManifest); err != nil {
		return fmt.Errorf("phase 3c: kubectl apply gitops-provider-app.yaml: %w", err)
	}
	cmd.Println("Phase 3c: gitops-provider Application applied ✓")

	cmd.Println("\nBootstrap complete. Flux will begin reconciling from Harbor OCI artifacts.")
	return nil
}

// newBootstrapRenderAndPushCmd returns the `staccato bootstrap render-and-push` command.
//
// render-and-push reads the kustomization.yaml from the staccato-environment ConfigMap
// (created by the ops-environment OAM Application), runs `kustomize build --enable-helm`
// to render each chart's full Kubernetes manifests, then pushes the combined output
// as an OCI artifact to Harbor.
//
// Flux's OCIRepository source then syncs the rendered manifests from Harbor, and the
// Kustomize controller applies them to the cluster.
//
// Local mode (default): manifests are pushed directly to Harbor.
// Production mode (deferred): manifests are pushed to a git repo and consumed via a
// Harbor proxy — see render-manifests.cue for the in-cluster Job equivalent.
func newBootstrapRenderAndPushCmd() *cobra.Command {
	var (
		env         string
		registryURL string
		tag         string
		namespace   string
	)

	cmd := &cobra.Command{
		Use:   "render-and-push",
		Short: "Render platform chart manifests and push as an OCI artifact to Harbor",
		Long: `render-and-push reads the kustomization.yaml from the staccato-environment ConfigMap
(env-<env> in vela-system), runs 'kustomize build --enable-helm' to produce the full
Kubernetes manifests for each platform chart, then pushes the combined output to Harbor
as an OCI artifact using the flux CLI.

Flux's OCIRepository source syncs the rendered manifests from Harbor. The Kustomize
controller applies them, deploying the platform services.

This command is idempotent — pushing with the same tag overwrites the existing artifact.

Network requirement (local mode): requires access to upstream Helm chart repositories
(charts.jetstack.io, aquasecurity.github.io, kedacore.github.io, etc.) to pull chart
tarballs during kustomize build --enable-helm.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRenderAndPush(cmd, env, registryURL, tag)
		},
	}

	cmd.Flags().StringVar(&env, "env", "ops",
		"Environment name — matches the env-<name> ConfigMap in vela-system created by staccato-environment")
	cmd.Flags().StringVar(&registryURL, "registry-url",
		"oci://harbor-core.harbor.svc.cluster.local/staccato/manifests",
		"OCI registry URL to push the rendered artifact to")
	cmd.Flags().StringVar(&tag, "tag", "latest",
		"Tag to apply to the pushed OCI artifact")
	cmd.Flags().StringVar(&namespace, "namespace", "vela-system",
		"Kubernetes namespace where the staccato-environment ConfigMap lives")

	return cmd
}

// runRenderAndPush fetches the kustomization.yaml from the environment ConfigMap,
// renders each chart via kustomize build --enable-helm, and pushes the output to Harbor.
func runRenderAndPush(cmd *cobra.Command, env, registryURL, tag string) error {
	configMapName := fmt.Sprintf("env-%s", env)
	namespace := "vela-system"

	// Extract kustomization.yaml from the staccato-environment ConfigMap.
	cmd.Printf("Fetching kustomization.yaml from ConfigMap %s/%s...\n", namespace, configMapName)
	kustomizationYAML, err := getConfigMapKey(cmd, namespace, configMapName, "kustomization.yaml")
	if err != nil {
		return fmt.Errorf("fetch ConfigMap %s: %w", configMapName, err)
	}

	// Write kustomization.yaml to a temp directory for kustomize to consume.
	tmpDir, err := os.MkdirTemp("", "staccato-render-*")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	kustomizationPath := fmt.Sprintf("%s/kustomization.yaml", tmpDir)
	if err := os.WriteFile(kustomizationPath, []byte(kustomizationYAML), 0600); err != nil {
		return fmt.Errorf("write kustomization.yaml: %w", err)
	}

	// Render all charts via kustomize build --enable-helm.
	renderedPath := fmt.Sprintf("%s/rendered", tmpDir)
	if err := os.MkdirAll(renderedPath, 0700); err != nil {
		return fmt.Errorf("create rendered dir: %w", err)
	}

	cmd.Printf("Rendering manifests via kustomize build --enable-helm in %s...\n", tmpDir)
	renderedManifests, err := runCmdOutput("kustomize", "build", "--enable-helm", tmpDir)
	if err != nil {
		return fmt.Errorf("kustomize build: %w", err)
	}

	manifestsFile := fmt.Sprintf("%s/manifests.yaml", renderedPath)
	if err := os.WriteFile(manifestsFile, renderedManifests, 0600); err != nil {
		return fmt.Errorf("write rendered manifests: %w", err)
	}
	cmd.Printf("Rendered %d bytes of manifests ✓\n", len(renderedManifests))

	// Push rendered manifests to Harbor as an OCI artifact via flux CLI.
	artifactURL := fmt.Sprintf("%s:%s", registryURL, tag)
	cmd.Printf("Pushing OCI artifact to %s...\n", artifactURL)
	if err := runCmd(cmd, "flux", "push", "artifact", artifactURL,
		"--source="+renderedPath,
		"--path="+renderedPath,
	); err != nil {
		return fmt.Errorf("flux push artifact: %w", err)
	}

	cmd.Printf("OCI artifact pushed: %s ✓\n", artifactURL)
	return nil
}

// getConfigMapKey retrieves a single key from a Kubernetes ConfigMap via kubectl.
func getConfigMapKey(cmd *cobra.Command, namespace, name, key string) (string, error) {
	jsonPath := fmt.Sprintf(`{.data.%s}`, key)
	out, err := runCmdOutput("kubectl", "get", "configmap", name,
		"-n", namespace,
		"-o", fmt.Sprintf("jsonpath=%s", jsonPath),
	)
	if err != nil {
		return "", err
	}
	if len(out) == 0 {
		return "", fmt.Errorf("key %q not found in ConfigMap %s/%s", key, namespace, name)
	}
	return string(out), nil
}

// runCmdOutput executes an external command and returns its stdout as bytes.
func runCmdOutput(name string, args ...string) ([]byte, error) {
	c := exec.Command(name, args...)
	c.Env = os.Environ()
	return c.Output()
}

// runCmd executes an external command with its output forwarded to the cobra command's
// stdout/stderr. It returns an error if the command exits non-zero.
func runCmd(cmd *cobra.Command, name string, args ...string) error {
	c := exec.Command(name, args...)
	c.Stdout = cmd.OutOrStdout()
	c.Stderr = cmd.ErrOrStderr()
	c.Env = os.Environ()
	return c.Run()
}
