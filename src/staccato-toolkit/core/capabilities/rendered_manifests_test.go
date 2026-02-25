package capabilities_test

import (
	"encoding/json"
	"testing"

	"github.com/invopop/jsonschema"
	"github.com/staccato-toolkit/core/capabilities"
)

func reflectSchema(t *testing.T) *jsonschema.Schema {
	t.Helper()
	r := &jsonschema.Reflector{AllowAdditionalProperties: false}
	return r.Reflect(&capabilities.RenderedManifests{})
}

func TestRenderedManifests_KoanfTag(t *testing.T) {
	// Verify the koanf struct tag is set on Repository.
	// We do this indirectly by checking the JSON Schema property name.
	schema := reflectSchema(t)
	raw, err := json.Marshal(schema)
	if err != nil {
		t.Fatalf("marshal schema: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal schema: %v", err)
	}
	// The schema should contain a "repository" property (lowercased from koanf tag)
	defs, _ := m["$defs"].(map[string]any)
	rm, _ := defs["RenderedManifests"].(map[string]any)
	props, _ := rm["properties"].(map[string]any)
	if _, ok := props["repository"]; !ok {
		t.Error("expected 'repository' property in JSON Schema, got none")
	}
}

func TestRenderedManifests_JSONSchemaExtend_PatternPresent(t *testing.T) {
	schema := reflectSchema(t)
	raw, err := json.Marshal(schema)
	if err != nil {
		t.Fatalf("marshal schema: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal schema: %v", err)
	}
	defs, _ := m["$defs"].(map[string]any)
	rm, _ := defs["RenderedManifests"].(map[string]any)
	props, _ := rm["properties"].(map[string]any)
	repo, _ := props["repository"].(map[string]any)
	pattern, ok := repo["pattern"].(string)
	if !ok || pattern == "" {
		t.Error("expected non-empty 'pattern' on repository property")
	}
}

func TestRenderedManifests_JSONSchemaExtend_SchemaURI(t *testing.T) {
	schema := reflectSchema(t)
	raw, err := json.Marshal(schema)
	if err != nil {
		t.Fatalf("marshal schema: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal schema: %v", err)
	}
	schemaURI, _ := m["$schema"].(string)
	if schemaURI == "" {
		t.Error("expected non-empty '$schema' field in JSON Schema output")
	}
}
