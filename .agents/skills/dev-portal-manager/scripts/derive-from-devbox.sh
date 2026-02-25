#!/usr/bin/env bash
#
# derive-from-devbox.sh
#
# Generates Backstage catalog Resource entities from devbox.json packages.
#
# Usage:
#   ./derive-from-devbox.sh [DEVBOX_JSON] [ENTITIES_DIR]
#
# Arguments:
#   DEVBOX_JSON   Path to devbox.json (default: ./devbox.json)
#   ENTITIES_DIR  Directory to write entity files (default: ./.entities)
#
# Behavior:
#   - Parses the 'packages' array from devbox.json
#   - For each package, creates a kind: Resource entity with spec.type: utility
#   - Writes entities to $ENTITIES_DIR/resource-<tool-name-kebab-case>.yaml
#   - Exits cleanly if packages array is empty or absent
#
# Requirements:
#   - jq (for JSON parsing)
#

set -euo pipefail

# Arguments with defaults
DEVBOX_JSON="${1:-./devbox.json}"
ENTITIES_DIR="${2:-./.entities}"

# Validate devbox.json exists
if [[ ! -f "$DEVBOX_JSON" ]]; then
	echo "Error: devbox.json not found at $DEVBOX_JSON"
	exit 1
fi

# Validate jq is available
if ! command -v jq &>/dev/null; then
	echo "Error: jq is required but not installed"
	exit 1
fi

# Create entities directory if it doesn't exist
mkdir -p "$ENTITIES_DIR"

# Extract packages array
packages=$(jq -r '.packages // [] | .[]' "$DEVBOX_JSON" 2>/dev/null || echo "")

# Check if packages is empty
if [[ -z "$packages" ]]; then
	echo "No packages found in $DEVBOX_JSON - no Resource entities generated"
	exit 0
fi

# Counter for generated entities
count=0

# Process each package
while IFS= read -r package; do
	# Extract package name (handle versioned packages like "jq@1.6")
	# Take everything before @ or the whole string if no @
	tool_name=$(echo "$package" | cut -d'@' -f1)

	# Convert to kebab-case (basic conversion: replace underscores/spaces with hyphens, lowercase)
	kebab_name=$(echo "$tool_name" | tr '[:upper:]' '[:lower:]' | tr '_' '-' | tr ' ' '-')

	# Generate entity file path
	entity_file="$ENTITIES_DIR/resource-${kebab_name}.yaml"

	# Create entity YAML
	cat >"$entity_file" <<EOF
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: ${kebab_name}
  title: ${tool_name}
  description: Utility tool managed via devbox
  tags:
    - devbox
    - cli
    - utility
spec:
  type: utility
  owner: platform-team
EOF

	echo "Generated: $entity_file"
	((count++))
done <<<"$packages"

echo ""
echo "Successfully generated $count Resource entities from $DEVBOX_JSON"
exit 0
