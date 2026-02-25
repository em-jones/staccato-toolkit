package flows

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/qmuntal/stateless"
	core "github.com/staccato-toolkit/core"
)

// InitFlow implements the project initialisation wizard.
//
// # Steps
//
//  1. Check whether .st.yaml already exists → if yes, short-circuit.
//  2. Prompt the user for a project name.
//  3. Ask the user to designate a git repository (separate from the current repo).
//  4. Write .st.yaml (name, stub, workspace with repo).
//  5. Ask whether to set up a workspace now; if yes, set ProvisionOnComplete.
//
// # State machine
//
//	stateInitIdle ──[triggerInitRun]──►  stateInitStart
//	stateInitStart
//	  ──[triggerInitConfigMissing]──► stateInitPromptName
//	  ──[triggerInitConfigExists]──►  stateInitAlreadyDone
//	stateInitPromptName ──[triggerInitNameProvided]──► stateInitPromptRepo
//	stateInitPromptRepo ──[triggerInitRepoProvided]──► stateInitWriteConfig
//	stateInitWriteConfig ──[triggerInitConfigWritten]──► stateInitAskWorkspace
//	stateInitAskWorkspace
//	  ──[triggerInitWorkspaceYes]──► stateInitDone
//	  ──[triggerInitWorkspaceNo]──►  stateInitDone
type InitFlow struct {
	sm *stateless.StateMachine

	// configPath is the absolute path where .st.yaml will be written.
	configPath string

	// Prompter abstracts user interaction so the flow is testable.
	Prompter InitPrompter

	// project accumulates the data collected during the wizard.
	project core.ProjectConfig

	// ProvisionOnComplete is true when the user asked to set up a workspace
	// immediately after initialisation.
	ProvisionOnComplete bool
}

// InitPrompter is the interface that the init flow uses to interact with the user.
type InitPrompter interface {
	// AskProjectName prompts for a project name and returns it.
	AskProjectName() (string, error)
	// AskGitRepo prompts for a git repository URL and returns it.
	AskGitRepo() (string, error)
	// AskSetupWorkspace asks whether to configure a workspace now.
	// Returns true for "yes".
	AskSetupWorkspace() (bool, error)
}

// init flow states
const (
	stateInitIdle        = "init:idle"
	stateInitStart       = "init:start"
	stateInitPromptName  = "init:prompt-name"
	stateInitPromptRepo  = "init:prompt-repo"
	stateInitWriteConfig = "init:write-config"
	stateInitAskWS       = "init:ask-workspace"
	stateInitDone        = "init:done"
	stateInitAlreadyDone = "init:already-done"
)

// init flow triggers
const (
	triggerInitRun           = "init:run"
	triggerInitConfigMissing = "init:config-missing"
	triggerInitConfigExists  = "init:config-exists"
	triggerInitNameProvided  = "init:name-provided"
	triggerInitRepoProvided  = "init:repo-provided"
	triggerInitConfigWritten = "init:config-written"
	triggerInitWorkspaceYes  = "init:workspace-yes"
	triggerInitWorkspaceNo   = "init:workspace-no"
)

// NewInitFlow constructs and wires the initialisation state machine.
//
// configPath is typically filepath.Join(cwd, core.ProjectConfigFile).
// prompter handles all user-facing I/O.
func NewInitFlow(configPath string, prompter InitPrompter) *InitFlow {
	f := &InitFlow{
		configPath: configPath,
		Prompter:   prompter,
	}
	f.sm = stateless.NewStateMachine(stateInitIdle)

	// stateInitIdle: waiting for Run() to kick off.
	f.sm.Configure(stateInitIdle).
		Permit(triggerInitRun, stateInitStart)

	// stateInitStart: check for existing config.
	f.sm.Configure(stateInitStart).
		OnEntry(func(ctx context.Context, _ ...any) error {
			existing, err := core.LoadProjectConfig(f.configPath)
			if err != nil {
				return fmt.Errorf("init: check existing config: %w", err)
			}
			if existing != nil {
				return f.sm.FireCtx(ctx, triggerInitConfigExists)
			}
			return f.sm.FireCtx(ctx, triggerInitConfigMissing)
		}).
		Permit(triggerInitConfigMissing, stateInitPromptName).
		Permit(triggerInitConfigExists, stateInitAlreadyDone)

	// stateInitPromptName: ask user for a project name.
	f.sm.Configure(stateInitPromptName).
		OnEntry(func(ctx context.Context, _ ...any) error {
			name, err := f.Prompter.AskProjectName()
			if err != nil {
				return fmt.Errorf("init: prompt project name: %w", err)
			}
			name = strings.TrimSpace(name)
			if name == "" {
				return fmt.Errorf("init: project name must not be empty")
			}
			f.project.Name = name
			return f.sm.FireCtx(ctx, triggerInitNameProvided)
		}).
		Permit(triggerInitNameProvided, stateInitPromptRepo)

	// stateInitPromptRepo: ask user for a git repository URL.
	f.sm.Configure(stateInitPromptRepo).
		OnEntry(func(ctx context.Context, _ ...any) error {
			repoURL, err := f.Prompter.AskGitRepo()
			if err != nil {
				return fmt.Errorf("init: prompt git repo: %w", err)
			}
			repoURL = strings.TrimSpace(repoURL)
			if repoURL == "" {
				return fmt.Errorf("init: git repository URL must not be empty")
			}
			return f.sm.FireCtx(ctx, triggerInitRepoProvided)
		}).
		Permit(triggerInitRepoProvided, stateInitWriteConfig)

	// stateInitWriteConfig: persist .st.yaml.
	f.sm.Configure(stateInitWriteConfig).
		OnEntry(func(ctx context.Context, _ ...any) error {
			if err := core.SaveProjectConfig(f.configPath, &f.project); err != nil {
				return fmt.Errorf("init: save config: %w", err)
			}
			return f.sm.FireCtx(ctx, triggerInitConfigWritten)
		}).
		Permit(triggerInitConfigWritten, stateInitAskWS)

	// stateInitAskWS: offer to set up the workspace immediately.
	f.sm.Configure(stateInitAskWS).
		OnEntry(func(ctx context.Context, _ ...any) error {
			yes, err := f.Prompter.AskSetupWorkspace()
			if err != nil {
				return fmt.Errorf("init: ask setup workspace: %w", err)
			}
			f.ProvisionOnComplete = yes
			if yes {
				return f.sm.FireCtx(ctx, triggerInitWorkspaceYes)
			}
			return f.sm.FireCtx(ctx, triggerInitWorkspaceNo)
		}).
		Permit(triggerInitWorkspaceYes, stateInitDone).
		Permit(triggerInitWorkspaceNo, stateInitDone)

	// Terminal states.
	f.sm.Configure(stateInitDone)
	f.sm.Configure(stateInitAlreadyDone)

	return f
}

// Run executes the init flow synchronously.
//
// When Run returns nil the caller should check ProvisionOnComplete: if true,
// run a ProvisionWorkspaceFlow against the config written to ConfigPath().
func (f *InitFlow) Run(ctx context.Context) error {
	if err := f.sm.FireCtx(ctx, triggerInitRun); err != nil {
		return fmt.Errorf("init flow: start: %w", err)
	}
	state := f.sm.MustState()
	if state != stateInitDone && state != stateInitAlreadyDone {
		return fmt.Errorf("init flow did not complete (state=%v)", state)
	}
	return nil
}

// ConfigPath returns the path of the .st.yaml this flow targets.
func (f *InitFlow) ConfigPath() string {
	return filepath.Clean(f.configPath)
}

// Project returns the project configuration collected during the wizard.
// Returns the zero value if the flow has not run or the config already existed.
func (f *InitFlow) Project() core.ProjectConfig {
	return f.project
}
