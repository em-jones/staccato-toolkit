package main

import (
	"context"
)

// RegistryService starts a Docker Distribution v2 registry container as a Dagger service.
// This provides a Harbor-compatible OCI endpoint for local development and Dagger test
// pipelines, without requiring an external Harbor deployment.
//
// The service listens on port 5000 and uses the alias "harbor" — matching the production
// cluster DNS pattern — so test registry URLs (e.g. oci://harbor:5000/test/manifests)
// require no modification when pointing at the real Harbor in CI.
//
// The registry is unauthenticated. For authenticated testing, pass registryCredentials
// to Render as normal.
//
// Usage in a Dagger pipeline:
//
//	registry, _ := platform.RegistryService(ctx)
//	result, _ := platform.Render(ctx, source, "local",
//	    "oci://harbor:5000/test/manifests", nil,
//	    dagger.RenderOpts{RegistryService: registry})
//
// Or from the CLI (bind the service then call render):
//
//	dagger call registry-service
//	dagger call render --source . --env local \
//	    --registry-url oci://harbor:5000/test/manifests
func (m *Platform) RegistryService(ctx context.Context) (*Service, error) {
	svc := dag.Container().
		From("registry:2").
		WithExposedPort(5000).
		AsService()
	return svc, nil
}
