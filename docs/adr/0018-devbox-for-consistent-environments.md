# 0018. Devbox for Consistent Development Environments

**Date:** 2026-02-25

## Status
Accepted

## Context

OpenSpec requires consistent development tooling across team members and CI/CD. Developers need specific versions of Go, Node.js, kubectl, helm, and other tools without polluting their global system.

**Devbox** (by Jetpack.io) provides:
- Declarative tool versioning via `devbox.json`
- Isolated environments per project (no global installs)
- Nix-based package management (reproducible builds)
- Shell integration (`devbox shell` activates environment)

Alternatives considered:
- **asdf**: Version manager but requires per-tool plugins
- **Docker dev containers**: Isolated but heavier and requires Docker
- **Manual installation**: Inconsistent versions across team
- **Nix directly**: Powerful but steep learning curve

## Decision

Adopt Devbox for managing development tool versions in OpenSpec.

All projects must:
- Define tool dependencies in `devbox.json`
- Document `devbox shell` as the standard development environment
- Pin tool versions for reproducibility
- Use Devbox in CI/CD for consistency with local development

## Consequences

**Easier:**
- Consistent tool versions across all developers
- Onboarding: `devbox shell` installs and activates all tools
- No global tool installation or version conflicts
- Reproducible builds (same tools locally and in CI)
- Automatic environment activation with direnv integration

**Harder:**
- Requires Devbox installation on developer machines
- Nix cache downloads can be slow on first run
- Learning curve for Devbox and Nix concepts
- Not all tools available in Nix packages (rare)

**Maintenance implications:**
- `devbox.json` must be maintained alongside code
- Tool version updates require updating `devbox.json`
- CI/CD must install and use Devbox
- Documentation must include Devbox setup instructions
- Team must align on when to upgrade tool versions

## Related Decisions

- ADR-0001: Adopt Go 1.23 (pinned in devbox.json)
- ADR-0003: Adopt Node.js v24 (pinned in devbox.json)
- ADR-0017: Kind for local Kubernetes development
- Tech Radar: Devbox marked as "Adopt"
