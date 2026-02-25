---
created-by-change: quality-tooling-adoption-process
last-validated: 2026-02-24
---

# Quality Tooling Pattern Rules

_Guidance for detecting missing quality tooling (linting, formatting, testing) for any technology introduced by a change, and for creating the prerequisite work to put that tooling in place before the change is considered complete._

## Core Principle

Every technology in the platform must have comprehensive quality tooling in place: at minimum, automated testing, linting, and code formatting. A change that introduces a new language, runtime, or service cannot be considered complete until quality tooling for that technology exists and is passing. If tooling is absent, it must be created in parallel — not deferred.

> "The deployment pipeline is, at its heart, an automated implementation of your application's build, deploy, test, and release process." — Continuous Delivery, Ch. 5

## Key Guidelines

### Audit: Determine Existing Coverage

When a change introduces a new technology, service, or language runtime, audit the existing toolchain for that technology before proceeding:

**Kinds of quality tooling to check:**

| Kind | What to look for |
|------|-----------------|
| **Linting** | A linter configured and running in CI for the technology (e.g., ESLint for TypeScript, golangci-lint for Go, flake8/ruff for Python) |
| **Formatting** | A formatter enforced in CI (e.g., Prettier, gofmt, Black) |
| **Testing** | An automated test suite with a test runner configured (e.g., Jest, Go test, pytest) |

If all three kinds exist and are passing for the technology, no quality tooling work is needed. The change may proceed and must ensure it does not break existing contracts (tests, linting, formatting remain passing).

### When Tooling is Missing: Parallel Changes

If one or more kinds of quality tooling are absent for a technology introduced by the change:

1. **Identify which kinds are missing** (linting, formatting, testing — separately).

2. **Create one OpenSpec change per missing kind** (not one change for all missing tooling — each kind is independent and parallelisable):
   ```
   openspec new change "add-<technology>-<kind>"
   # e.g., openspec new change "add-go-linting"
   #        openspec new change "add-go-testing"
   ```

3. **Make these changes prerequisites to the main change's completion**: the main change may continue implementation, but it must not be considered complete (i.e., not archived/closed) until all quality tooling changes are complete and passing.

   In `td`, wire this as a dependency from the main change's completion gate to each tooling change:
   ```bash
   # Create a completion-gate task on the main change
   td create "Gate: quality tooling in place for <technology>" \
     --type task \
     --parent <change-root-id> \
     --body "Blocks completion. Satisfied when these changes are closed and passing:
   - add-<technology>-linting (td-xxxxx)
   - add-<technology>-testing (td-yyyyy)"

   # Wire dependencies
   td dep add <gate-task-id> <linting-change-root-id>
   td dep add <gate-task-id> <testing-change-root-id>
   ```

4. **Announce the parallel changes** in the change's design or progress log so the team knows what's running in parallel.

### Adherence: The Change Must Not Break Existing Contracts

When quality tooling already exists for a technology:

- All existing tests must remain passing after the change is applied
- Linting must remain clean (no new violations introduced)
- Formatting must remain clean (no new formatting violations)

If the change requires updating tests or linting configuration as a direct consequence of the implementation, those updates are in scope and must be included in the change.

### What Counts as "Comprehensive" Tooling

Tooling is considered comprehensive if:

- **Testing**: There is a runnable test suite with at least one passing test, a test runner configured (e.g., in `package.json` scripts, `Makefile`, or CI pipeline), and the test suite runs in CI on every commit
- **Linting**: A linter is configured with a ruleset appropriate for the technology, linting runs in CI on every commit, and linting failures block merges
- **Formatting**: A formatter is configured, formatter checks run in CI on every commit, and formatter failures block merges

Tooling that exists in configuration files but is not hooked into CI does not count.

## Common Issues

**"The change is almost done but we don't have tests for this language yet"**
→ Do not wait until the change is complete to discover this. Run the quality tooling audit as part of the design phase — before implementation begins. If tooling is missing, create the parallel tooling changes immediately so they can run concurrently.

**"We only need one small feature in this language — does it really need full tooling?"**
→ Yes. The threshold is the technology, not the size of the change. One file in a new language without linting and testing is one file that grows without a safety net. The parallel tooling changes are lightweight by design — they only need to set up the toolchain, not write exhaustive tests.

**"The linting change and testing change are blocked waiting on each other"**
→ They should be independent. Linting and formatting setup do not depend on a test suite existing, and vice versa. Create them as separate parallel changes.

**"I ran the tooling audit and tooling exists but is not running in CI"**
→ That does not satisfy the requirement. Tooling must be running in CI. Create a change to wire the existing tooling into CI before proceeding.

## See Also

- [CI/CD Pattern](./ci-cd.md) — pipeline structure, stages, and quality gates
- [Testing Pattern](../code/testing.md) — unit test structure and coverage expectations
- [Environments Pattern](./environments.md) — environment parity for test runs
- _Continuous Delivery_, Humble & Farley — Chapter 3: Continuous Integration
- AWS Well-Architected Framework: Operational Excellence Pillar
