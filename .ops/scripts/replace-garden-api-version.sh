#!/usr/bin/env bash
# replace-garden-api-version.sh
# Replaces all occurrences of "garden.io/v2" with "garden.io/v0" project-wide.
# Targets: *.yml, *.yaml, *.md

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OLD="garden.io/v2"
NEW="garden.io/v0"

echo "Scanning: $REPO_ROOT"
echo "Replacing: $OLD → $NEW"
echo

mapfile -t files < <(
  grep -rl "$OLD" "$REPO_ROOT" \
    --include="*.yml" \
    --include="*.yaml" \
    --include="*.md" \
    2>/dev/null
)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No files contain '$OLD'. Nothing to do."
  exit 0
fi

for f in "${files[@]}"; do
  sed -i "s|${OLD}|${NEW}|g" "$f"
  echo "  updated: ${f#"$REPO_ROOT/"}"
done

echo
echo "Done. ${#files[@]} file(s) updated."
