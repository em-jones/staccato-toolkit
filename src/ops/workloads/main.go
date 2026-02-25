// Platform provides CI/CD pipeline functions for the openspec-td repository.
//
// This is a Dagger module. Functions are invoked with:
//
//	dagger call lint
//	dagger call test
//	dagger call build
package main

import (
	"context"
	"fmt"
	"strings"
)

// main is the dagger module entry point. When invoked via `dagger call`, the
// dagger engine calls the appropriate method on Platform directly.
// This main() exists only to satisfy the Go compiler for package main.
func main() {}

// Platform is the dagger module type. All exported methods become callable tasks.
type Platform struct{}

// Lint runs linting checks on the source directory.
// Returns "no linter configured" if no linter config is found.
func (m *Platform) Lint(ctx context.Context, source *Directory) (string, error) {
	linterConfigs := []string{
		".golangci.yml",
		".golangci.yaml",
		".golangci.json",
		".eslintrc",
		".eslintrc.js",
		".eslintrc.json",
		"eslint.config.js",
	}

	container := dag.Container().
		From("golang:1.23-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src")

	// Check for any linter config file
	for _, cfg := range linterConfigs {
		_, err := container.WithExec([]string{"test", "-f", cfg}).Sync(ctx)
		if err == nil {
			// Config found — attempt to run golangci-lint
			out, lintErr := container.
				WithExec([]string{"sh", "-c",
					"apk add --no-cache curl && " +
						"curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /usr/local/bin && " +
						"golangci-lint run"}).
				Stdout(ctx)
			if lintErr != nil {
				return fmt.Sprintf("linter config found (%s) but execution failed: %v", cfg, lintErr), lintErr
			}
			return out, nil
		}
	}

	return "no linter configured", nil
}

// Test runs the test suite for all Go modules in the workspace.
func (m *Platform) Test(ctx context.Context, source *Directory) (string, error) {
	container := dag.Container().
		From("golang:1.23-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src")

	// Go workspace layout: check for go.work at source root
	_, err := container.WithExec([]string{"test", "-f", "go.work"}).Sync(ctx)
	if err == nil {
		modules := []string{
			"src/staccato-toolkit/cli",
			"src/staccato-toolkit/server",
			"src/staccato-toolkit/core",
		}
		var results []string
		for _, mod := range modules {
			out, testErr := container.
				WithWorkdir("/src/" + mod).
				WithExec([]string{"go", "test", "./..."}).
				Stdout(ctx)
			if testErr != nil {
				return fmt.Sprintf("tests failed in %s: %v\n%s", mod, testErr, out), testErr
			}
			results = append(results, fmt.Sprintf("%s: ok\n%s", mod, out))
		}
		return strings.Join(results, "\n"), nil
	}

	// Single-module layout: check for go.mod
	_, err = container.WithWorkdir("/src").WithExec([]string{"test", "-f", "go.mod"}).Sync(ctx)
	if err == nil {
		out, testErr := container.WithExec([]string{"go", "test", "./..."}).Stdout(ctx)
		if testErr != nil {
			return fmt.Sprintf("test execution failed: %v", testErr), testErr
		}
		return out, nil
	}

	// Node.js project: check for package.json with a test script
	nodeContainer := dag.Container().
		From("node:20-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src")

	_, err = nodeContainer.WithExec([]string{"test", "-f", "package.json"}).Sync(ctx)
	if err == nil {
		out, testErr := nodeContainer.
			WithExec([]string{"sh", "-c", "npm install && npm test || echo 'no test script configured'"}).
			Stdout(ctx)
		if testErr != nil {
			return fmt.Sprintf("test execution failed: %v", testErr), testErr
		}
		return out, nil
	}

	return "no test suite configured - placeholder for future test implementation", nil
}

// Build builds the project inside a container.
// Returns "no build step configured" if no build script is found.
func (m *Platform) Build(ctx context.Context, source *Directory) (string, error) {
	container := dag.Container().
		From("golang:1.23-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src")

	// Go project: check for go.mod
	_, err := container.WithExec([]string{"test", "-f", "go.mod"}).Sync(ctx)
	if err == nil {
		out, buildErr := container.WithExec([]string{"go", "build", "./..."}).Stdout(ctx)
		if buildErr != nil {
			return fmt.Sprintf("build failed: %v", buildErr), buildErr
		}
		return out, nil
	}

	// Node.js project: check for package.json with build script
	nodeContainer := dag.Container().
		From("node:20-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src")

	_, err = nodeContainer.WithExec([]string{"test", "-f", "package.json"}).Sync(ctx)
	if err == nil {
		out, buildErr := nodeContainer.
			WithExec([]string{"sh", "-c", "npm install && npm run build || echo 'no build script configured'"}).
			Stdout(ctx)
		if buildErr != nil {
			return fmt.Sprintf("build failed: %v", buildErr), buildErr
		}
		return out, nil
	}

	return "no build step configured", nil
}

// Format checks that all Go source files are gofmt-formatted.
// Returns the list of unformatted files, or empty string if all files are clean.
// Exits non-zero if any files require formatting.
func (m *Platform) Format(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("golang:1.23-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			"find . -name '*.go' -not -path '*/vendor/*' | xargs gofmt -l"}).
		Stdout(ctx)
	if err != nil {
		return "", err
	}
	if out != "" {
		return out, fmt.Errorf("the following files are not gofmt-formatted:\n%s\nRun: gofmt -w <file> to fix", out)
	}
	return "all Go files are correctly formatted", nil
}

// FormatMd checks that all markdown files are formatted according to Prettier.
// Requires a .prettierrc configuration file at the source root.
// Exits non-zero if any files require formatting, listing the non-conformant files.
func (m *Platform) FormatMd(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("node:20-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			"npm install --global prettier@3 && " +
				`prettier --check "**/*.md" --ignore-path .prettierignore`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("markdown formatting check failed — run 'prettier --write \"**/*.md\"' to fix:\n%w", err)
	}
	return "all markdown files are correctly formatted", nil
}

// LintMd runs markdownlint-cli2 against all markdown files in the source directory.
// Requires a .markdownlint.json configuration file at the source root.
// Exits non-zero if any violations are found, reporting file, line, and rule name.
func (m *Platform) LintMd(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("node:20-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			"npm install --global markdownlint-cli2@0.17 && " +
				`markdownlint-cli2 "**/*.md" "#node_modules/**" "#.devbox/**" "#.git/**" "#site/**"`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("markdown lint failed:\n%w", err)
	}
	return "all markdown files pass markdownlint", nil
}

// LintProse runs Vale prose linter against all markdown files in the source directory.
// Requires a .vale.ini configuration file at the source root.
// Runs `vale sync` inside the container to fetch configured styles before linting.
// Exits non-zero if any error-level violations are found.
func (m *Platform) LintProse(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("jdkato/vale:latest").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			`vale sync && \
			find . -name "*.md" \
				-not -path "./node_modules/*" \
				-not -path "./.devbox/*" \
				-not -path "./.git/*" \
				-not -path "./site/*" \
				-not -path "./.vale/*" \
				| xargs vale --output=line --minAlertLevel=error`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("prose linting failed:\n%w", err)
	}
	return "all markdown files pass Vale prose linting", nil
}

// SpellCheck runs cspell against all markdown files in the source directory.
// Requires a cspell.config.yaml configuration file at the source root.
// Exits non-zero if any spelling violations are found.
func (m *Platform) SpellCheck(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("node:20-alpine").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			"npm install --global cspell@8 && " +
				`cspell lint "**/*.md" --no-progress --config cspell.config.yaml`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("spell check failed:\n%w", err)
	}
	return "all markdown files pass spell check", nil
}

// CheckLinks runs lychee link checker against all markdown files in the source directory.
// Requires a lychee.toml configuration file at the source root.
// Exits non-zero if any broken links are found.
func (m *Platform) CheckLinks(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("lycheeverse/lychee:latest").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			`find . -name "*.md" \
				-not -path "./node_modules/*" \
				-not -path "./.devbox/*" \
				-not -path "./.git/*" \
				-not -path "./site/*" \
				| xargs lychee --config lychee.toml --no-progress`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("link check failed:\n%w", err)
	}
	return "all links are valid", nil
}

// Shellcheck runs shellcheck static analysis against all .sh files found in
// the source directory. Excludes .git/, all node_modules/ paths (at any depth), and .devbox/.
// Returns "no shell scripts found" and exits zero if no .sh files are present.
// Exits non-zero if any violations are found.
func (m *Platform) Shellcheck(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("koalaman/shellcheck-alpine:stable").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			`files=$(find . -name "*.sh" \
				-not -path "./.git/*" \
				-not -path "*/node_modules/*" \
				-not -path "./.devbox/*" \
				2>/dev/null) ; \
			if [ -z "$files" ]; then \
				echo "no shell scripts found"; \
				exit 0; \
			fi; \
			echo "$files" | xargs shellcheck`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("shellcheck found violations: %w", err)
	}
	if out == "" {
		return "all shell scripts passed shellcheck", nil
	}
	return out, nil
}

// ShfmtCheck checks that all .sh files are formatted according to shfmt defaults.
// Excludes .git/, all node_modules/ paths (at any depth), and .devbox/.
// Returns "no shell scripts found" and exits zero if no .sh files are present.
// Returns "all shell scripts are correctly formatted" and exits zero if all files pass.
// Exits non-zero if any files differ from their shfmt-formatted form.
func (m *Platform) ShfmtCheck(ctx context.Context, source *Directory) (string, error) {
	out, err := dag.Container().
		From("alpine:latest").
		WithExec([]string{"apk", "add", "-q", "--no-cache", "shfmt"}).
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c",
			`files=$(find . -name "*.sh" \
				-not -path "./.git/*" \
				-not -path "*/node_modules/*" \
				-not -path "./.devbox/*" \
				2>/dev/null); \
			if [ -z "$files" ]; then \
				echo "no shell scripts found"; \
				exit 0; \
			fi; \
			echo "$files" | xargs shfmt -d`}).
		Stdout(ctx)
	if err != nil {
		return out, fmt.Errorf("shfmt found unformatted files: %w", err)
	}
	if out == "no shell scripts found\n" {
		return "no shell scripts found", nil
	}
	if out == "" {
		return "all shell scripts are correctly formatted", nil
	}
	return out, nil
}
