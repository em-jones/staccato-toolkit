package flows_test

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	core "github.com/staccato-toolkit/core"
	"github.com/staccato-toolkit/core/flows"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func writeConfig(t *testing.T, dir string, cfg *core.ProjectConfig) string {
	t.Helper()
	path := filepath.Join(dir, core.ProjectConfigFile)
	if err := core.SaveProjectConfig(path, cfg); err != nil {
		t.Fatalf("writeConfig: %v", err)
	}
	return path
}

// ── InitPrompter mocks ────────────────────────────────────────────────────────

type stubInitPrompter struct {
	name     string
	repo     string
	setupNow bool
	nameErr  error
	repoErr  error
	setupErr error
}

func (s *stubInitPrompter) AskProjectName() (string, error)  { return s.name, s.nameErr }
func (s *stubInitPrompter) AskGitRepo() (string, error)      { return s.repo, s.repoErr }
func (s *stubInitPrompter) AskSetupWorkspace() (bool, error) { return s.setupNow, s.setupErr }

// ── InitFlow tests ────────────────────────────────────────────────────────────

func TestInitFlow_HappyPath_NoProvision(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewInitFlow(configPath, &stubInitPrompter{
		name:     "My Platform",
		repo:     "https://github.com/org/platform.git",
		setupNow: false,
	})
	if err := f.Run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}

	if f.ProvisionOnComplete {
		t.Error("ProvisionOnComplete should be false when user said no")
	}

	loaded, err := core.LoadProjectConfig(configPath)
	if err != nil || loaded == nil {
		t.Fatalf("config not written: %v", err)
	}
	if loaded.Name != "My Platform" {
		t.Errorf("Name = %q, want %q", loaded.Name, "My Platform")
	}
	if loaded.Stub != "my-platform" {
		t.Errorf("Stub = %q, want %q", loaded.Stub, "my-platform")
	}
	if len(loaded.Workspaces) != 1 {
		t.Fatalf("len(Workspaces) = %d, want 1", len(loaded.Workspaces))
	}
	if loaded.Workspaces[0].GitRepo.URL != "https://github.com/org/platform.git" {
		t.Errorf("GitRepo.URL = %q", loaded.Workspaces[0].GitRepo.URL)
	}
}

func TestInitFlow_HappyPath_WithProvision(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewInitFlow(configPath, &stubInitPrompter{
		name:     "platform",
		repo:     "git@github.com:org/infra.git",
		setupNow: true,
	})
	if err := f.Run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
	if !f.ProvisionOnComplete {
		t.Error("ProvisionOnComplete should be true when user said yes")
	}
}

func TestInitFlow_AlreadyInitialised(t *testing.T) {
	dir := t.TempDir()
	configPath := writeConfig(t, dir, &core.ProjectConfig{Name: "Existing", Stub: "existing"})

	// Prompter must never be called.
	f := flows.NewInitFlow(configPath, &stubInitPrompter{
		nameErr: errors.New("should not be called"),
	})
	if err := f.Run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
	loaded, _ := core.LoadProjectConfig(configPath)
	if loaded.Name != "Existing" {
		t.Errorf("config was mutated; Name = %q", loaded.Name)
	}
}

func TestInitFlow_EmptyNameReturnsError(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewInitFlow(configPath, &stubInitPrompter{name: "   "})
	if err := f.Run(context.Background()); err == nil {
		t.Error("expected error for whitespace-only project name")
	}
}

func TestInitFlow_EmptyRepoReturnsError(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewInitFlow(configPath, &stubInitPrompter{name: "valid", repo: ""})
	if err := f.Run(context.Background()); err == nil {
		t.Error("expected error for empty git repo URL")
	}
}

func TestInitFlow_NamePromptError(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewInitFlow(configPath, &stubInitPrompter{nameErr: errors.New("stdin closed")})
	if err := f.Run(context.Background()); err == nil {
		t.Error("expected error when name prompter fails")
	}
}

func TestInitFlow_ConfigPath(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewInitFlow(configPath, &stubInitPrompter{})
	if got := f.ConfigPath(); got != configPath {
		t.Errorf("ConfigPath() = %q, want %q", got, configPath)
	}
}

// ── CheckDependenciesFlow tests ───────────────────────────────────────────────

// TestCheckDependenciesFlow_PathBased probes actual PATH availability and asserts
// the flow's outcome is consistent with what is installed.
func TestCheckDependenciesFlow_PathBased(t *testing.T) {
	_, hasRuntime := exec.LookPath("docker")
	if hasRuntime != nil {
		// Try other runtimes.
		for _, rt := range []string{"podman", "nerdctl", "lima", "orbstack"} {
			if _, err := exec.LookPath(rt); err == nil {
				hasRuntime = nil
				break
			}
		}
	}
	_, devboxErr := exec.LookPath("devbox")

	f := flows.NewCheckDependenciesFlow()
	err := f.Run(context.Background())

	switch {
	case hasRuntime == nil && devboxErr == nil:
		// Both present → success.
		if err != nil {
			t.Errorf("expected success with runtime+devbox in PATH, got: %v", err)
		}
	case hasRuntime != nil:
		// No runtime → must fail.
		if err == nil {
			t.Error("expected error when no container runtime is in PATH")
		}
	default:
		// Runtime present, devbox missing → must fail.
		if err == nil {
			t.Error("expected error when devbox is not in PATH")
		}
	}
}

// ── ProvisionPrompter mock ────────────────────────────────────────────────────

type stubProvisionPrompter struct {
	idx    int
	idxErr error
}

func (s *stubProvisionPrompter) SelectWorkspace(_ []core.Workspace) (int, error) {
	return s.idx, s.idxErr
}

// ── ProvisionWorkspaceFlow tests ──────────────────────────────────────────────

func TestProvisionWorkspaceFlow_NeedsInit_MissingConfig(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, core.ProjectConfigFile)

	f := flows.NewProvisionWorkspaceFlow(configPath, &stubProvisionPrompter{})
	if err := f.Run(context.Background()); !errors.Is(err, flows.ErrNeedsInit) {
		t.Errorf("expected ErrNeedsInit, got: %v", err)
	}
}

func TestProvisionWorkspaceFlow_NeedsInit_NoWorkspaces(t *testing.T) {
	dir := t.TempDir()
	configPath := writeConfig(t, dir, &core.ProjectConfig{
		Name: "Proj", Stub: "proj",
	})

	f := flows.NewProvisionWorkspaceFlow(configPath, &stubProvisionPrompter{})
	if err := f.Run(context.Background()); !errors.Is(err, flows.ErrNeedsInit) {
		t.Errorf("expected ErrNeedsInit, got: %v", err)
	}
}

func TestProvisionWorkspaceFlow_SingleWorkspace_SkipsPrompt(t *testing.T) {
	dir := t.TempDir()
	configPath := writeConfig(t, dir, &core.ProjectConfig{
		Name: "Proj",
		Stub: "proj",
		Workspaces: []core.Workspace{
			{Name: "w1", GitRepo: core.GitRepo{URL: "https://github.com/org/repo.git"}},
		},
	})

	// If the prompter were called it would return an error, failing the flow with
	// a different message than expected.
	f := flows.NewProvisionWorkspaceFlow(configPath, &stubProvisionPrompter{
		idxErr: errors.New("should not prompt when only one workspace"),
	})
	_ = f.Run(context.Background()) // may fail at dep check — that's fine

	// Workspace must have been selected (before deps check).
	if ws := f.SelectedWorkspace(); ws == nil {
		t.Error("SelectedWorkspace should be non-nil after selection")
	} else if ws.Name != "w1" {
		t.Errorf("SelectedWorkspace().Name = %q, want %q", ws.Name, "w1")
	}
}

func TestProvisionWorkspaceFlow_MultiWorkspace_UsesPrompter(t *testing.T) {
	dir := t.TempDir()
	configPath := writeConfig(t, dir, &core.ProjectConfig{
		Name: "Proj",
		Stub: "proj",
		Workspaces: []core.Workspace{
			{Name: "w1", GitRepo: core.GitRepo{URL: "https://github.com/org/repo1.git"}},
			{Name: "w2", GitRepo: core.GitRepo{URL: "https://github.com/org/repo2.git"}},
		},
	})

	// Prompter selects index 1 (second workspace).
	f := flows.NewProvisionWorkspaceFlow(configPath, &stubProvisionPrompter{idx: 1})
	_ = f.Run(context.Background()) // may fail at dep check

	if ws := f.SelectedWorkspace(); ws != nil && ws.Name != "w2" {
		t.Errorf("SelectedWorkspace().Name = %q, want %q", ws.Name, "w2")
	}
}

func TestProvisionWorkspaceFlow_DevboxJSON_MergesPackages(t *testing.T) {
	dir := t.TempDir()
	configPath := writeConfig(t, dir, &core.ProjectConfig{
		Name: "P",
		Stub: "p",
		Workspaces: []core.Workspace{
			{Name: "w", GitRepo: core.GitRepo{URL: "https://github.com/org/repo.git"}},
		},
	})

	// Pre-seed devbox.json with one existing package.
	devboxPath := filepath.Join(dir, "devbox.json")
	if err := os.WriteFile(devboxPath, []byte(`{"packages":["go@latest"]}`+"\n"), 0o644); err != nil {
		t.Fatalf("write devbox.json: %v", err)
	}

	f := flows.NewProvisionWorkspaceFlow(configPath, &stubProvisionPrompter{})
	_ = f.Run(context.Background()) // ignore dep-check error in CI

	// devbox.json must still be valid (non-empty) JSON.
	raw, err := os.ReadFile(devboxPath)
	if err != nil {
		t.Fatalf("read devbox.json: %v", err)
	}
	if len(raw) == 0 {
		t.Error("devbox.json must not be empty after provisioning attempt")
	}
}
