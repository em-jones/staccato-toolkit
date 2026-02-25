package core

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/invopop/jsonschema"
	"github.com/joho/godotenv"
	koanyaml "github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/env/v2"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/providers/rawbytes"
	"github.com/knadh/koanf/v2"

	"github.com/staccato-toolkit/core/capabilities"
)

// Config holds all configuration for the staccato-toolkit core module.
type Config struct {
	Capabilities []Capability                   `koanf:"capabilities"`
	Rendered     capabilities.RenderedManifests  `koanf:"rendered"`
}

// LoadOptions configures the sources for [Load].
type LoadOptions struct {
	// YAMLPath is the path to a YAML config file. Empty means skip.
	YAMLPath string
	// DotenvPath is the path to a .env file. Empty means skip.
	DotenvPath string
	// EnvPrefix is stripped from environment variable names before mapping.
	// For example, prefix "APP_" maps APP_RENDERED_REPOSITORY → rendered.repository.
	// Empty means no prefix stripping.
	EnvPrefix string
}

// Load merges configuration from (in priority order, lowest to highest):
//  1. YAML file (if YAMLPath is non-empty)
//  2. .env file (if DotenvPath is non-empty)
//  3. OS environment variables
//
// A missing YAML or .env file is silently ignored; a malformed file returns an error.
func Load(opts LoadOptions) (*Config, error) {
	k := koanf.New(".")

	// 1. YAML file (lowest priority)
	if opts.YAMLPath != "" {
		if err := loadYAML(k, opts.YAMLPath); err != nil {
			return nil, fmt.Errorf("config: load YAML %q: %w", opts.YAMLPath, err)
		}
	}

	// 2. dotenv file
	if opts.DotenvPath != "" {
		if err := loadDotenv(k, opts.DotenvPath); err != nil {
			return nil, fmt.Errorf("config: load dotenv %q: %w", opts.DotenvPath, err)
		}
	}

	// 3. Environment variables (highest priority)
	// Use "." as delimiter so APP_RENDERED_REPOSITORY → rendered.repository
	envOpt := env.Opt{}
	if opts.EnvPrefix != "" {
		prefix := strings.ToUpper(opts.EnvPrefix)
		envOpt.Prefix = prefix
		envOpt.TransformFunc = func(k, v string) (string, any) {
			key := strings.TrimPrefix(k, prefix)
			key = strings.ToLower(strings.ReplaceAll(key, "_", "."))
			return key, v
		}
	} else {
		envOpt.TransformFunc = func(k, v string) (string, any) {
			return strings.ToLower(strings.ReplaceAll(k, "_", ".")), v
		}
	}
	if err := k.Load(env.Provider(".", envOpt), nil); err != nil {
		return nil, fmt.Errorf("config: load env vars: %w", err)
	}

	var cfg Config
	if err := k.Unmarshal("", &cfg); err != nil {
		return nil, fmt.Errorf("config: unmarshal: %w", err)
	}
	return &cfg, nil
}

// loadYAML loads a YAML file into k. A missing file is silently ignored.
func loadYAML(k *koanf.Koanf, path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil
	}
	return k.Load(file.Provider(path), koanyaml.Parser())
}

// loadDotenv loads a .env file into k. A missing file is silently ignored.
// Values are injected as flat JSON (rawbytes provider) so koanf can merge them.
func loadDotenv(k *koanf.Koanf, path string) error {
	envMap, err := godotenv.Read(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	// Encode as JSON so rawbytes + nil parser treats it as a flat map.
	raw, err := json.Marshal(envMap)
	if err != nil {
		return fmt.Errorf("encode dotenv as json: %w", err)
	}
	return k.Load(rawbytes.Provider(raw), nil)
}

// Schema returns the JSON Schema (Draft 2020-12) for [Config] as JSON bytes.
// The schema reflects the Config struct and includes the RenderedManifests
// sub-schema with the Repository git URL pattern constraint.
func Schema() ([]byte, error) {
	r := &jsonschema.Reflector{
		AllowAdditionalProperties: false,
	}
	schema := r.Reflect(&Config{})
	b, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("config: marshal schema: %w", err)
	}
	return b, nil
}
