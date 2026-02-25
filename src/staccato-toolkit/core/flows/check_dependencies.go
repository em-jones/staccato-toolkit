package flows

import (
	"context"
	"fmt"
	"os/exec"

	"github.com/qmuntal/stateless"
)

// CheckDependenciesFlow verifies that required tools (a container runtime and
// devbox) are available on the host. Run it before any flow that needs a
// development workspace.
//
// # State machine
//
//	stateDepIdle    ──[triggerDepRun]──►  stateDepCheckRuntime
//	stateDepCheckRuntime
//	  ──[triggerRuntimeFound]──►  stateDepCheckDevbox
//	  ──[triggerRuntimeMissing]──► stateDepsFailed
//	stateDepCheckDevbox
//	  ──[triggerDevboxFound]──►  stateDepsDone
//	  ──[triggerDevboxMissing]──► stateDepsFailed
type CheckDependenciesFlow struct {
	sm *stateless.StateMachine

	// Err is populated when the flow reaches stateDepsFailed.
	Err error
}

// dep flow states
const (
	stateDepIdle         = "dep:idle"
	stateDepCheckRuntime = "dep:check-runtime"
	stateDepCheckDevbox  = "dep:check-devbox"
	stateDepsDone        = "dep:done"
	stateDepsFailed      = "dep:failed"
)

// dep flow triggers
const (
	triggerDepRun         = "dep:run"
	triggerRuntimeFound   = "dep:runtime-found"
	triggerRuntimeMissing = "dep:runtime-missing"
	triggerDevboxFound    = "dep:devbox-found"
	triggerDevboxMissing  = "dep:devbox-missing"
)

// containerRuntimes is the ordered list of binaries to probe.
var containerRuntimes = []string{"docker", "podman", "nerdctl", "lima", "orbstack"}

// NewCheckDependenciesFlow constructs and wires the dependency-check state machine.
func NewCheckDependenciesFlow() *CheckDependenciesFlow {
	f := &CheckDependenciesFlow{}
	f.sm = stateless.NewStateMachine(stateDepIdle)

	// stateDepIdle: waiting for Run() to fire triggerDepRun.
	f.sm.Configure(stateDepIdle).
		Permit(triggerDepRun, stateDepCheckRuntime)

	// stateDepCheckRuntime: probe for a container runtime.
	f.sm.Configure(stateDepCheckRuntime).
		OnEntry(func(ctx context.Context, _ ...any) error {
			runtime := findRuntime()
			if runtime != "" {
				return f.sm.FireCtx(ctx, triggerRuntimeFound, runtime)
			}
			return f.sm.FireCtx(ctx, triggerRuntimeMissing)
		}).
		Permit(triggerRuntimeFound, stateDepCheckDevbox).
		Permit(triggerRuntimeMissing, stateDepsFailed)

	// stateDepCheckDevbox: probe for devbox.
	f.sm.Configure(stateDepCheckDevbox).
		OnEntry(func(ctx context.Context, _ ...any) error {
			if hasDevbox() {
				return f.sm.FireCtx(ctx, triggerDevboxFound)
			}
			return f.sm.FireCtx(ctx, triggerDevboxMissing)
		}).
		Permit(triggerDevboxFound, stateDepsDone).
		Permit(triggerDevboxMissing, stateDepsFailed)

	// stateDepsDone: terminal — all dependencies satisfied.
	f.sm.Configure(stateDepsDone)

	// stateDepsFailed: terminal — record the failure reason.
	f.sm.Configure(stateDepsFailed).
		OnEntryFrom(triggerRuntimeMissing, func(_ context.Context, _ ...any) error {
			f.Err = fmt.Errorf(
				"no container runtime found; install one of %v and re-run",
				containerRuntimes,
			)
			return nil
		}).
		OnEntryFrom(triggerDevboxMissing, func(_ context.Context, _ ...any) error {
			f.Err = fmt.Errorf(
				"devbox not found; install it from https://www.jetify.com/devbox and re-run",
			)
			return nil
		})

	return f
}

// Run executes the dependency-check flow synchronously.
// Returns nil only when all dependencies are satisfied.
func (f *CheckDependenciesFlow) Run(ctx context.Context) error {
	if err := f.sm.FireCtx(ctx, triggerDepRun); err != nil {
		return fmt.Errorf("dependency check: start: %w", err)
	}
	if f.Err != nil {
		return f.Err
	}
	if f.sm.MustState() != stateDepsDone {
		return fmt.Errorf("dependency check did not complete (state=%v)", f.sm.MustState())
	}
	return nil
}

// findRuntime returns the first container runtime binary found on PATH, or "".
func findRuntime() string {
	for _, bin := range containerRuntimes {
		if _, err := exec.LookPath(bin); err == nil {
			return bin
		}
	}
	return ""
}

// hasDevbox returns true when devbox is available on PATH.
func hasDevbox() bool {
	_, err := exec.LookPath("devbox")
	return err == nil
}
