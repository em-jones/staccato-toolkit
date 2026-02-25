package capabilities

import (
	"github.com/invopop/jsonschema"
)

// gitURLPattern matches HTTPS and SSH git repository URLs.
// Accepted forms:
//   - https://github.com/org/repo
//   - https://github.com/org/repo.git
//   - git@github.com:org/repo.git
const gitURLPattern = `^(https://[a-zA-Z0-9._-]+/[a-zA-Z0-9._/-]+(\.git)?|git@[a-zA-Z0-9._-]+:[a-zA-Z0-9._/-]+(\.git)?)$`

// RenderedManifests holds configuration for the rendered-manifests capability.
type RenderedManifests struct {
	// Repository is the Git repository URL for rendered manifests.
	// Must be a valid HTTPS or SSH git URL.
	Repository string `json:"repository" koanf:"repository"`
}

// JSONSchemaExtend adds custom JSON Schema constraints to RenderedManifests.
// It constrains Repository to a valid git repository URL pattern.
func (RenderedManifests) JSONSchemaExtend(schema *jsonschema.Schema) {
	repoSchema, ok := schema.Properties.Get("repository")
	if !ok {
		return
	}
	repoSchema.Pattern = gitURLPattern
}
