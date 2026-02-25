package core

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	koanyaml "github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
	goyaml "go.yaml.in/yaml/v3"
)

// ProjectConfigFile is the canonical name for the staccato project config.
const ProjectConfigFile = ".st.yaml"

// GitRepo holds details about a remote git repository.
type GitRepo struct {
	// URL is the HTTPS or SSH URL of the repository.
	URL string `yaml:"url" koanf:"url"`
}

// Workspace represents a single named workspace within the project.
type Workspace struct {
	// Name is the human-readable identifier for the workspace.
	Name string `yaml:"name" koanf:"name"`
	// GitRepo is the repository associated with this workspace.
	GitRepo GitRepo `yaml:"git_repo" koanf:"git_repo"`
}

// ProjectConfig is the schema for .st.yaml.
type ProjectConfig struct {
	// Name is the human-readable project name.
	Name string `yaml:"name" koanf:"name"`
}

// Validate checks that required fields are present and well-formed.
func (p *ProjectConfig) Validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("project name must not be empty")
	}
	return nil
}

// StubFromName derives a URL-safe stub from a project name.
// It lower-cases the name, replaces spaces and underscores with hyphens,
// and strips any remaining characters that are not [a-z0-9-].
func StubFromName(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	// Remove all characters that are not lowercase letters, digits, or hyphens.
	re := regexp.MustCompile(`[^a-z0-9-]`)
	s = re.ReplaceAllString(s, "")
	// Collapse consecutive hyphens.
	collapse := regexp.MustCompile(`-{2,}`)
	s = collapse.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// LoadProjectConfig reads a ProjectConfig from path.
// Returns (nil, nil) if the file does not exist.
func LoadProjectConfig(path string) (*ProjectConfig, error) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, nil
	}
	k := koanf.New(".")
	if err := k.Load(file.Provider(path), koanyaml.Parser()); err != nil {
		return nil, fmt.Errorf("project config: load %q: %w", path, err)
	}
	var cfg ProjectConfig
	if err := k.Unmarshal("", &cfg); err != nil {
		return nil, fmt.Errorf("project config: unmarshal: %w", err)
	}
	return &cfg, nil
}

// SaveProjectConfig writes cfg to path as YAML, creating or truncating the file.
func SaveProjectConfig(path string, cfg *ProjectConfig) error {
	if err := cfg.Validate(); err != nil {
		return fmt.Errorf("project config: invalid: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("project config: mkdir: %w", err)
	}
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("project config: create %q: %w", path, err)
	}
	defer f.Close()
	enc := goyaml.NewEncoder(f)
	enc.SetIndent(2)
	if err := enc.Encode(cfg); err != nil {
		return fmt.Errorf("project config: encode: %w", err)
	}
	return nil
}
