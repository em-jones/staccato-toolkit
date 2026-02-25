package core_test

import (
	"os"
	"path/filepath"
	"testing"

	core "github.com/staccato-toolkit/core"
)

func TestStubFromName(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"simple", "My Project", "my-project"},
		{"underscores", "my_project", "my-project"},
		{"special chars", "Hello! World@2025", "hello-world2025"},
		{"already clean", "my-project", "my-project"},
		{"consecutive hyphens", "foo--bar", "foo-bar"},
		{"leading trailing hyphens", "-foo-", "foo"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := core.StubFromName(tt.in); got != tt.want {
				t.Errorf("StubFromName(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestSaveAndLoadProjectConfig(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, core.ProjectConfigFile)

	cfg := &core.ProjectConfig{
		Name: "Test Project",
		Stub: "test-project",
		Workspaces: []core.Workspace{
			{Name: "test-project-workspace", GitRepo: core.GitRepo{URL: "https://github.com/org/repo.git"}},
		},
	}

	if err := core.SaveProjectConfig(path, cfg); err != nil {
		t.Fatalf("SaveProjectConfig: %v", err)
	}

	loaded, err := core.LoadProjectConfig(path)
	if err != nil {
		t.Fatalf("LoadProjectConfig: %v", err)
	}
	if loaded == nil {
		t.Fatal("LoadProjectConfig returned nil for existing file")
	}
	if loaded.Name != cfg.Name {
		t.Errorf("Name = %q, want %q", loaded.Name, cfg.Name)
	}
	if loaded.Stub != cfg.Stub {
		t.Errorf("Stub = %q, want %q", loaded.Stub, cfg.Stub)
	}
	if len(loaded.Workspaces) != 1 {
		t.Fatalf("len(Workspaces) = %d, want 1", len(loaded.Workspaces))
	}
	if loaded.Workspaces[0].GitRepo.URL != cfg.Workspaces[0].GitRepo.URL {
		t.Errorf("GitRepo.URL = %q, want %q", loaded.Workspaces[0].GitRepo.URL, cfg.Workspaces[0].GitRepo.URL)
	}
}

func TestLoadProjectConfig_MissingFileReturnsNil(t *testing.T) {
	loaded, err := core.LoadProjectConfig("/nonexistent/.st.yaml")
	if err != nil {
		t.Fatalf("expected nil error for missing file, got: %v", err)
	}
	if loaded != nil {
		t.Errorf("expected nil config for missing file, got: %+v", loaded)
	}
}

func TestProjectConfig_Validate(t *testing.T) {
	t.Run("valid", func(t *testing.T) {
		cfg := &core.ProjectConfig{Name: "Foo", Stub: "foo"}
		if err := cfg.Validate(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
	t.Run("empty name", func(t *testing.T) {
		cfg := &core.ProjectConfig{Name: "", Stub: "foo"}
		if err := cfg.Validate(); err == nil {
			t.Error("expected error for empty name")
		}
	})
	t.Run("invalid stub", func(t *testing.T) {
		cfg := &core.ProjectConfig{Name: "Foo", Stub: "Foo Bar!"}
		if err := cfg.Validate(); err == nil {
			t.Error("expected error for invalid stub")
		}
	})
}

func TestSaveProjectConfig_InvalidConfigReturnsError(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, core.ProjectConfigFile)
	cfg := &core.ProjectConfig{Name: "", Stub: ""}
	if err := core.SaveProjectConfig(path, cfg); err == nil {
		t.Error("expected error saving invalid config, got nil")
	}
}

func TestSaveProjectConfig_CreatesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "nested", core.ProjectConfigFile)
	cfg := &core.ProjectConfig{Name: "X", Stub: "x"}
	if err := core.SaveProjectConfig(path, cfg); err != nil {
		t.Fatalf("SaveProjectConfig: %v", err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("expected file at %s: %v", path, err)
	}
}
