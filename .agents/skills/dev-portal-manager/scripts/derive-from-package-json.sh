#!/usr/bin/env bash
#
# derive-from-package-json.sh
#
# Generates Backstage catalog Resource entities from package.json dependencies.
#
# Usage:
#   ./derive-from-package-json.sh [PACKAGE_JSON] [ENTITIES_DIR]
#
# Arguments:
#   PACKAGE_JSON  Path to package.json (default: ./package.json)
#   ENTITIES_DIR  Directory to write entity files (default: ./.entities)
#
# Behavior:
#   - Parses both 'dependencies' and 'devDependencies' from package.json
#   - For each package, creates a kind: Resource entity with spec.type: node-library
#   - Writes entities to $ENTITIES_DIR/resource-<package-name-kebab-case>.yaml
#   - Exits cleanly if no dependencies are present
#
# Requirements:
#   - jq (for JSON parsing)
#

set -euo pipefail

# Arguments with defaults
PACKAGE_JSON="${1:-./package.json}"
ENTITIES_DIR="${2:-./.entities}"

# Validate package.json exists
if [[ ! -f "$PACKAGE_JSON" ]]; then
	echo "Error: package.json not found at $PACKAGE_JSON"
	exit 1
fi

# Validate jq is available
if ! command -v jq &>/dev/null; then
	echo "Error: jq is required but not installed"
	exit 1
fi

# Create entities directory if it doesn't exist
mkdir -p "$ENTITIES_DIR"

# Extract all dependencies (both dependencies and devDependencies)
deps=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' "$PACKAGE_JSON" 2>/dev/null || echo "")

# Check if dependencies is empty
if [[ -z "$deps" ]]; then
	echo "No dependencies found in $PACKAGE_JSON - no Resource entities generated"
	exit 0
fi

# Counter for generated entities
count=0

# Process each dependency
while IFS= read -r package_name; do
	# Convert to kebab-case (handle scoped packages like @org/package)
	# Remove @ prefix if present, replace / with -, lowercase
	kebab_name=$(echo "$package_name" | sed 's/^@//' | tr '/' '-' | tr '[:upper:]' '[:lower:]' | tr '_' '-')

	# Generate entity file path
	entity_file="$ENTITIES_DIR/resource-${kebab_name}.yaml"

	# Create entity YAML
	cat >"$entity_file" <<EOF
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: ${kebab_name}
  title: ${package_name}
  description: Node.js library dependency
  tags:
    - npm
    - node
    - library
spec:
  type: node-library
  owner: platform-team
EOF

	echo "Generated: $entity_file"
	((count++))
done <<<"$deps"

echo ""
echo "Successfully generated $count Resource entities from $PACKAGE_JSON"
exit 0
