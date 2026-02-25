package flows

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/qmuntal/stateless"
	core "github.com/staccato-toolkit/core"
)

// ProvisionWorkspaceFlow sets up a development workspace from an existing .st.yaml.
//
// # Steps
//
//  1. Load .st.yaml; if missing or empty, surface ErrNeedsInit.
//  2. Prompt the user to select a workspace (skipped when only one exists).
//  3. Run CheckDependenciesFlow.
//  4. If deps pass: create/update devbox.json with kubectl, kind, and the
//     project flake reference from the workspace git repo.
//  5. Print instructions to run `st dev`.
//
// # State machine
//
//	stateProvIdle ──[triggerProvRun]──► stateProvStart
//	stateProvStart
//	  ──[triggerProvConfigLoaded]──► stateProvSelectWS
//	  ──[triggerProvNeedsInit]──►    stateProvNeedInit
//	stateProvSelectWS ──[triggerProvWSSelected]──► stateProvCheckDeps
//	stateProvCheckDeps
//	  ──[triggerProvDepsOK]──►     stateProvUpdateDevbox
//	  ──[triggerProvDepsFailed]──► stateProvDepsFailed
//	stateProvUpdateDevbox ──[triggerProvDevboxUpdated]──► stateProvDone
type ProvisionWorkspaceFlow struct {
	sm *stateless.StateMachine

	// configPath is the path to .st.yaml.
	configPath string

	// Prompter handles workspace selection I/O.
	Prompter ProvisionPrompter

	// selectedWorkspace is the workspace chosen by the user.
	selectedWorkspace *core.Workspace

	// depErr holds the error from a failed dependency check.
	depErr error
}

// ProvisionPrompter abstracts user I/O for workspace selection.
type ProvisionPrompter interface {
	// SelectWorkspace presents available workspaces and returns the chosen index.
	SelectWorkspace(workspaces []core.Workspace) (int, error)
}

// ErrNeedsInit is returned when the project has not been initialised.
var ErrNeedsInit = fmt.Errorf("project not initialised; run `st init` first")

// prov flow states
const (
	stateProvIdle         = "prov:idle"
	stateProvStart        = "prov:start"
	stateProvSelectWS     = "prov:select-ws"
	stateProvCheckDeps    = "prov:check-deps"
	stateProvUpdateDevbox = "prov:update-devbox"
	stateProvDone         = "prov:done"
	stateProvNeedInit     = "prov:need-init"
	stateProvDepsFailed   = "prov:deps-failed"
)

// prov flow triggers
const (
	triggerProvRun           = "prov:run"
	triggerProvConfigLoaded  = "prov:config-loaded"
	triggerProvNeedsInit     = "prov:needs-init"
	triggerProvWSSelected    = "prov:ws-selected"
	triggerProvDepsOK        = "prov:deps-ok"
	triggerProvDepsFailed    = "prov:deps-failed"
	triggerProvDevboxUpdated = "prov:devbox-updated"
)

// NewProvisionWorkspaceFlow constructs and wires the provision-workspace state machine.
func NewProvisionWorkspaceFlow(configPath string, prompter ProvisionPrompter) *ProvisionWorkspaceFlow {
	f := &ProvisionWorkspaceFlow{
		configPath: configPath,
		Prompter:   prompter,
	}
	f.sm = stateless.NewStateMachine(stateProvIdle)

	// stateProvIdle: waiting for Run().
	f.sm.Configure(stateProvIdle).
		Permit(triggerProvRun, stateProvStart)

	// stateProvStart: load .st.yaml.
	f.sm.Configure(stateProvStart).
		OnEntry(func(ctx context.Context, _ ...any) error {
			cfg, err := core.LoadProjectConfig(f.configPath)
			if err != nil {
				return fmt.Errorf("provision: load config: %w", err)
			}
			if cfg == nil || len(cfg.Workspaces) == 0 {
				return f.sm.FireCtx(ctx, triggerProvNeedsInit)
			}
			return f.sm.FireCtx(ctx, triggerProvConfigLoaded)
		}).
		Permit(triggerProvConfigLoaded, stateProvSelectWS).
		Permit(triggerProvNeedsInit, stateProvNeedInit)

	// stateProvSelectWS: let the user choose a workspace.
	f.sm.Configure(stateProvSelectWS).
		OnEntry(func(ctx context.Context, _ ...any) error {
			cfg, err := core.LoadProjectConfig(f.configPath)
			if err != nil {
				return fmt.Errorf("provision: reload config: %w", err)
			}
			var idx int
			if len(cfg.Workspaces) > 1 {
				idx, err = f.Prompter.SelectWorkspace(cfg.Workspaces)
				if err != nil {
					return fmt.Errorf("provision: select workspace: %w", err)
				}
			}
			if idx < 0 || idx >= len(cfg.Workspaces) {
				return fmt.Errorf("provision: workspace index %d out of range [0,%d)", idx, len(cfg.Workspaces))
			}
			ws := cfg.Workspaces[idx]
			f.selectedWorkspace = &ws
			return f.sm.FireCtx(ctx, triggerProvWSSelected)
		}).
		Permit(triggerProvWSSelected, stateProvCheckDeps)

	// stateProvCheckDeps: run CheckDependenciesFlow.
	f.sm.Configure(stateProvCheckDeps).
		OnEntry(func(ctx context.Context, _ ...any) error {
			depFlow := NewCheckDependenciesFlow()
			if err := depFlow.Run(ctx); err != nil {
				f.depErr = err
				return f.sm.FireCtx(ctx, triggerProvDepsFailed)
			}
			return f.sm.FireCtx(ctx, triggerProvDepsOK)
		}).
		Permit(triggerProvDepsOK, stateProvUpdateDevbox).
		Permit(triggerProvDepsFailed, stateProvDepsFailed)

	// stateProvUpdateDevbox: create/update devbox.json.
	f.sm.Configure(stateProvUpdateDevbox).
		OnEntry(func(ctx context.Context, _ ...any) error {
			wsDir := filepath.Dir(f.configPath)
			if err := upsertDevboxJSON(wsDir, f.selectedWorkspace); err != nil {
				return fmt.Errorf("provision: update devbox.json: %w", err)
			}
			return f.sm.FireCtx(ctx, triggerProvDevboxUpdated)
		}).
		Permit(triggerProvDevboxUpdated, stateProvDone)

	// Terminal states.
	f.sm.Configure(stateProvDone)
	f.sm.Configure(stateProvNeedInit)
	f.sm.Configure(stateProvDepsFailed)

	return f
}

// Run executes the provision-workspace flow synchronously.
// Returns ErrNeedsInit when the project has not been initialised.
func (f *ProvisionWorkspaceFlow) Run(ctx context.Context) error {
	if err := f.sm.FireCtx(ctx, triggerProvRun); err != nil {
		return fmt.Errorf("provision flow: start: %w", err)
	}
	switch f.sm.MustState() {
	case stateProvDone:
		printWorkspaceReady(f.selectedWorkspace)
		return nil
	case stateProvNeedInit:
		return ErrNeedsInit
	case stateProvDepsFailed:
		return f.depErr
	default:
		return fmt.Errorf("provision flow did not complete (state=%v)", f.sm.MustState())
	}
}

// SelectedWorkspace returns the workspace selected during the flow, or nil.
func (f *ProvisionWorkspaceFlow) SelectedWorkspace() *core.Workspace {
	return f.selectedWorkspace
}

// devboxConfig is the minimal subset of devbox.json that we manage.
type devboxConfig struct {
	Schema   string   `json:"$schema,omitempty"`
	Packages []string `json:"packages"`
}

// upsertDevboxJSON creates or updates devbox.json in wsDir to include:
//   - kubectl@latest
//   - kind@latest
//   - the project flake from the workspace git repo (git+<url>)
func upsertDevboxJSON(wsDir string, ws *core.Workspace) error {
	devboxPath := filepath.Join(wsDir, "devbox.json")

	var cfg devboxConfig
	if raw, err := os.ReadFile(devboxPath); err == nil {
		if jsonErr := json.Unmarshal(raw, &cfg); jsonErr != nil {
			return fmt.Errorf("parse existing devbox.json: %w", jsonErr)
		}
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("read devbox.json: %w", err)
	}

	if cfg.Schema == "" {
		cfg.Schema = "https://raw.githubusercontent.com/jetify-com/devbox/0.16.0/.schema/devbox.schema.json"
	}

	// Build the flake reference for the workspace git repo.
	// devbox supports: github:<org>/<repo>/<ref>#<attr>  or  git+<url>
	flakeRef := fmt.Sprintf("git+%s", ws.GitRepo.URL)

	cfg.Packages = mergePackages(cfg.Packages, []string{
		"kubectl@latest",
		"kind@latest",
		flakeRef,
	})

	raw, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal devbox.json: %w", err)
	}
	if err := os.WriteFile(devboxPath, append(raw, '\n'), 0o644); err != nil {
		return fmt.Errorf("write devbox.json: %w", err)
	}
	return nil
}

// mergePackages appends entries from required that are not already in existing.
func mergePackages(existing, required []string) []string {
	set := make(map[string]struct{}, len(existing))
	for _, p := range existing {
		set[p] = struct{}{}
	}
	result := make([]string, len(existing))
	copy(result, existing)
	for _, p := range required {
		if _, ok := set[p]; !ok {
			result = append(result, p)
		}
	}
	return result
}

// printWorkspaceReady prints a user-facing summary after successful provisioning.
func printWorkspaceReady(ws *core.Workspace) {
	if ws == nil {
		return
	}
	fmt.Printf("\n✓ Workspace %q provisioned.\n", ws.Name)
	fmt.Println("  Run `st dev` to start your development environment.")
}
