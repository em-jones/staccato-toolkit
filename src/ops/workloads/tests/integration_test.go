//go:build integration

// Package tests contains integration tests for the platform dagger module.
//
// Integration tests require a running dagger engine (Docker must be available).
// Run with: go test -tags integration ./tests/...
//
// In CI these tests run automatically on ubuntu-latest runners that provide Docker.
// Locally, ensure Docker is running before executing these tests.
package tests

import (
	"os"
	"os/exec"
	"strings"
	"testing"
)

// isDockerAvailable returns true if the Docker socket is accessible.
func isDockerAvailable() bool {
	_, err := os.Stat("/var/run/docker.sock")
	return err == nil
}

// skipIfNoDocker skips the test with a clear message when Docker is not available.
func skipIfNoDocker(t *testing.T) {
	t.Helper()
	if !isDockerAvailable() {
		t.Skip("Docker socket not available at /var/run/docker.sock — skipping integration test")
	}
}

// runDagger executes a dagger call and returns stdout, stderr, and any error.
func runDagger(t *testing.T, task string) (string, string, error) {
	t.Helper()
	cmd := exec.Command("dagger", "call", task)
	cmd.Dir = ".." // run from src/ops/platform/
	out, err := cmd.CombinedOutput()
	return string(out), "", err
}

// TestLintIntegration runs the lint dagger task against a real container runtime.
func TestLintIntegration(t *testing.T) {
	skipIfNoDocker(t)

	out, _, err := runDagger(t, "lint")
	if err != nil {
		t.Logf("lint output: %s", out)
		t.Errorf("lint task failed: %v", err)
		return
	}

	// Lint should either report "no linter configured" or linting output
	if !strings.Contains(out, "no linter configured") && !strings.Contains(out, "lint") {
		t.Errorf("unexpected lint output: %q", out)
	}
	t.Logf("lint output: %s", out)
}

// TestTestIntegration runs the test dagger task against a real container runtime.
func TestTestIntegration(t *testing.T) {
	skipIfNoDocker(t)

	out, _, err := runDagger(t, "test")
	if err != nil {
		t.Logf("test output: %s", out)
		t.Errorf("test task failed: %v", err)
		return
	}

	t.Logf("test output: %s", out)
}

// TestBuildIntegration runs the build dagger task against a real container runtime.
func TestBuildIntegration(t *testing.T) {
	skipIfNoDocker(t)

	out, _, err := runDagger(t, "build")
	if err != nil {
		t.Logf("build output: %s", out)
		t.Errorf("build task failed: %v", err)
		return
	}

	t.Logf("build output: %s", out)
}
