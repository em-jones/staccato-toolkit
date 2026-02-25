package core_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/staccato-toolkit/core"
)

// writeFile writes content to a temp file and returns its path.
func writeFile(t *testing.T, name, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("writeFile %s: %v", name, err)
	}
	return path
}

func TestLoad_YAMLOnly(t *testing.T) {
	yaml := writeFile(t, "config.yaml", "rendered:\n  repository: https://github.com/org/repo.git\n")
	cfg, err := core.Load(core.LoadOptions{YAMLPath: yaml})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Rendered.Repository != "https://github.com/org/repo.git" {
		t.Errorf("Repository = %q, want %q", cfg.Rendered.Repository, "https://github.com/org/repo.git")
	}
}

func TestLoad_MissingYAMLIsIgnored(t *testing.T) {
	_, err := core.Load(core.LoadOptions{YAMLPath: "/nonexistent/config.yaml"})
	if err != nil {
		t.Fatalf("Load with missing YAML should succeed, got: %v", err)
	}
}

func TestLoad_MissingDotenvIsIgnored(t *testing.T) {
	_, err := core.Load(core.LoadOptions{DotenvPath: "/nonexistent/.env"})
	if err != nil {
		t.Fatalf("Load with missing dotenv should succeed, got: %v", err)
	}
}

func TestLoad_InvalidYAMLReturnsError(t *testing.T) {
	bad := writeFile(t, "bad.yaml", "not: valid: yaml: :")
	_, err := core.Load(core.LoadOptions{YAMLPath: bad})
	if err == nil {
		t.Error("expected error for invalid YAML, got nil")
	}
}

func TestLoad_EnvVarOverridesYAML(t *testing.T) {
	yaml := writeFile(t, "config.yaml", "rendered:\n  repository: https://github.com/org/yaml-repo.git\n")
	t.Setenv("RENDERED_REPOSITORY", "git@github.com:org/env-repo.git")
	cfg, err := core.Load(core.LoadOptions{YAMLPath: yaml})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Rendered.Repository != "git@github.com:org/env-repo.git" {
		t.Errorf("Repository = %q, want env override %q", cfg.Rendered.Repository, "git@github.com:org/env-repo.git")
	}
}

func TestLoad_AllThreeSourcesMerge(t *testing.T) {
	// YAML: sets rendered.repository
	yaml := writeFile(t, "config.yaml", "rendered:\n  repository: https://github.com/yaml/repo.git\n")
	// dotenv: not used in this test (env var takes highest priority)
	// env var: overrides rendered.repository
	t.Setenv("RENDERED_REPOSITORY", "https://github.com/env/repo.git")
	cfg, err := core.Load(core.LoadOptions{YAMLPath: yaml})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Rendered.Repository != "https://github.com/env/repo.git" {
		t.Errorf("Repository = %q, want env value %q", cfg.Rendered.Repository, "https://github.com/env/repo.git")
	}
}

func TestSchema_ReturnsValidJSONSchema(t *testing.T) {
	b, err := core.Schema()
	if err != nil {
		t.Fatalf("Schema: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("Schema output is not valid JSON: %v", err)
	}
	if _, ok := m["$schema"]; !ok {
		t.Error("expected '$schema' field in Schema() output")
	}
}

func TestSchema_RepositoryPatternPresent(t *testing.T) {
	b, err := core.Schema()
	if err != nil {
		t.Fatalf("Schema: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	defs, _ := m["$defs"].(map[string]any)
	rm, _ := defs["RenderedManifests"].(map[string]any)
	props, _ := rm["properties"].(map[string]any)
	repo, _ := props["repository"].(map[string]any)
	pattern, ok := repo["pattern"].(string)
	if !ok || pattern == "" {
		t.Error("expected non-empty 'pattern' on repository property in Schema() output")
	}
}
