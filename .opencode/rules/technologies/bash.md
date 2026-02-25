---
created-by-change: technology-audit
last-validated: 2026-02-25
---

# Shell/Bash Usage Rules

Bash is the standard shell scripting language for automation, CI/CD tasks, and system operations. All shell scripts MUST use bash (not sh, zsh, or other shells) for consistency and portability across development and deployment environments.

## Table of Contents

- [Core Principle](#core-principle)
- [Key Guidelines](#key-guidelines)
  - [Script structure and shebang](#script-structure-and-shebang)
  - [Quote variables to prevent word splitting](#quote-variables-to-prevent-word-splitting)
  - [Prefer explicit error handling](#prefer-explicit-error-handling)
- [shellcheck](#shellcheck)
  - [Usage Standards](#usage-standards)
- [shfmt](#shfmt)
  - [Usage Standards](#usage-standards-1)
- [Common Issues](#common-issues)
- [See Also](#see-also)

## Core Principle

Bash is the standard for all shell scripts in this platform. All scripts MUST include a shebang (`#!/usr/bin/env bash`) and be validated with shellcheck. Use bash for CI/CD automation, build scripts, and system operations. For complex business logic or data processing, prefer Go or TypeScript instead.

## Key Guidelines

### Script structure and shebang

Always use the portable shebang and enable strict error handling:

```bash
#!/usr/bin/env bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script description and usage
# Usage: ./script.sh <arg1> <arg2>

main() {
    # Script logic here
}

main "$@"
```

### Quote variables to prevent word splitting

Always quote variables unless you explicitly need word splitting:

```bash
# ✓ Good: Quoted variables
file_path="/path/with spaces/file.txt"
cat "$file_path"

# ✗ Avoid: Unquoted variables (breaks with spaces)
cat $file_path
```

### Prefer explicit error handling

Use explicit error checks instead of relying solely on `set -e`:

```bash
# ✓ Good: Explicit error handling
if ! command_that_might_fail; then
    echo "Error: command failed" >&2
    exit 1
fi

# ✓ Good: Capture and check exit code
if result=$(risky_command 2>&1); then
    echo "Success: $result"
else
    echo "Failed with: $result" >&2
    exit 1
fi
```

## shellcheck

shellcheck is a static analysis tool for shell scripts that detects bugs and style issues. All bash scripts MUST pass shellcheck validation.

### Usage Standards

- Run on all `.sh` files: `shellcheck scripts/*.sh`
- Disable specific warnings with `# shellcheck disable=SC####` when needed and justified
- Use strict mode in scripts: `set -euo pipefail`
- Use `[[ ]]` for conditionals in Bash, not `[ ]`
- Avoid shell-specific features in portable scripts

```bash
#!/bin/bash
set -euo pipefail

# Good: quoted variable
echo "Hello, $USER"

# Bad (shellcheck warning SC2086):
# echo Hello, $USER
```

Run shellcheck in CI/CD pipelines to catch common issues:

```bash
# Validate all bash scripts
shellcheck **/*.sh

# Disable specific warnings when justified
# shellcheck disable=SC2086
variable_without_quotes=$1
```

## shfmt

shfmt is a code formatter for shell scripts (Bash, sh, mksh, ksh). All bash scripts MUST be formatted with shfmt for consistency.

### Usage Standards

- Format all `.sh` files: `shfmt -i 2 -w scripts/*.sh`
- Use 2-space indentation (consistent with platform convention)
- Run in CI to enforce formatting: `shfmt -d scripts/*.sh` (fail if changes needed)
- Configure in `.shfmtrc` or include flags in Dagger pipeline
- Format on save in editors (VS Code: shellformat extension)

```bash
# Format with 2-space indentation, simplify code
shfmt -i 2 -s -w script.sh
```

`.shfmtrc` configuration:

```bash
-i 2        # indent 2 spaces
-bn         # binary operators on new line
```

## Common Issues

**"Script fails silently in CI but works locally"**
→ Add `set -euo pipefail` at the top of the script. This ensures scripts exit on errors, undefined variables, and pipe failures.

**"shellcheck warnings about quoting"**
→ Quote all variable expansions: `"$var"` instead of `$var`. Use shellcheck's suggestions to fix issues.

**"Script behavior differs between environments"**
→ Use `#!/usr/bin/env bash` instead of `#!/bin/bash` for portability. Avoid bash-specific features if the script needs to run on minimal environments.

**"Formatter and linter disagree"**
→ Run shfmt first (formatting), then shellcheck (linting). They address different concerns and do not conflict.

## See Also

- [CI/CD Pattern Rules](../patterns/delivery/ci-cd.md) - CI/CD automation patterns
- [Dagger Usage Rules](./dagger.md) - Dagger CI/CD pipeline integration
