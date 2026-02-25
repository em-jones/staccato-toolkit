package main

import (
	"context"
	"fmt"
	"strings"
)

// PublishModule builds and pushes the Platform Dagger module to Daggerverse.
//
// The published module reference includes the git commit SHA as the version
// identifier, making each publish traceable to a specific source commit.
//
// Usage:
//
//	dagger call publish-module --source . --dagger-token env:DAGGER_TOKEN
func (m *Platform) PublishModule(
	ctx context.Context,
	source *Directory,
	daggerToken *Secret,
) (string, error) {
	if daggerToken == nil {
		return "", fmt.Errorf("publish-module: daggerToken is required")
	}

	// Resolve the current commit SHA from source for version tagging.
	sha, err := dag.Container().
		From("alpine/git:latest").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"git", "rev-parse", "--short", "HEAD"}).
		Stdout(ctx)
	if err != nil {
		return "", fmt.Errorf("publish-module: git rev-parse: %w", err)
	}
	shortSHA := strings.TrimSpace(sha)

	// Run dagger publish to push the module to Daggerverse.
	// The module name is derived from dagger.json (name: "platform").
	ref, err := dag.Container().
		From("ghcr.io/dagger/engine:v0.19.11").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src/src/ops/workloads").
		WithSecretVariable("DAGGER_TOKEN", daggerToken).
		WithExec([]string{"dagger", "publish", "--tag", shortSHA}).
		Stdout(ctx)
	if err != nil {
		return "", fmt.Errorf("publish-module: dagger publish: %w", err)
	}

	moduleRef := strings.TrimSpace(ref)
	if moduleRef == "" {
		return "", fmt.Errorf("publish-module: dagger publish returned empty module reference")
	}
	return moduleRef, nil
}
