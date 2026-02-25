#!/usr/bin/env bash
# Ensures every component entity has its techdocs, adrs, and mkdocs.yml scaffolding.
#
# Usage: ./scripts/ensure-component-docs.sh [--dry-run]
#
# Each component entity file in .entities/ must have a path comment on its first
# line (e.g. "# src/ops/workloads"). This script reads that comment, resolves the
# path relative to the repo root, and creates any missing:
#   <path>/docs/index.md
#   <path>/docs/adrs/          (Backstage ADR plugin expects this path)
#   <path>/mkdocs.yml
#
# Existing files are never overwritten.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENTITIES_DIR="$REPO_ROOT/.entities"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
	DRY_RUN=true
	echo "[dry-run] No files will be written."
fi

created=0
skipped=0
errors=0

for entity_file in "$ENTITIES_DIR"/component-*.yaml; do
	first_line="$(head -n1 "$entity_file")"

	# Expect a comment of the form: # <relative-path>
	if [[ ! "$first_line" =~ ^#[[:space:]]+([^[:space:]].*)$ ]]; then
		echo "ERROR: $entity_file — first line is not a path comment (got: $first_line)" >&2
		((errors++)) || true
		continue
	fi

	rel_path="${BASH_REMATCH[1]}"
	component_dir="$REPO_ROOT/$rel_path"

	# Derive a human-readable title from the directory name
	dir_name="$(basename "$component_dir")"
	title="$(echo "$dir_name" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')"

	# Derive site_name and site_description from the entity metadata
	site_name="$title"
	site_description="$(grep -m1 'description:' "$entity_file" | sed 's/^[[:space:]]*description:[[:space:]]*//' | sed "s/ — lives at.*//")"
	if [[ -z "$site_description" ]]; then
		site_description="$title component documentation"
	fi

	echo "--- $entity_file → $rel_path"

	# ── docs/index.md ──────────────────────────────────────────────────────────
	docs_dir="$component_dir/docs"
	index_file="$docs_dir/index.md"
	if [[ -f "$index_file" ]]; then
		echo "  skip  $rel_path/docs/index.md (exists)"
		((skipped++)) || true
	else
		echo "  create $rel_path/docs/index.md"
		if [[ "$DRY_RUN" == false ]]; then
			mkdir -p "$docs_dir"
			cat >"$index_file" <<EOF
# $title

$site_description
EOF
		fi
		((created++)) || true
	fi

	# ── docs/adrs/ ─────────────────────────────────────────────────────────────
	# Backstage ADR plugin reads from backstage.io/adr-location: docs/adrs
	adr_dir="$component_dir/docs/adrs"
	if [[ -d "$adr_dir" ]]; then
		echo "  skip  $rel_path/docs/adrs/ (exists)"
		((skipped++)) || true
	else
		echo "  create $rel_path/docs/adrs/"
		if [[ "$DRY_RUN" == false ]]; then
			mkdir -p "$adr_dir"
		fi
		((created++)) || true
	fi

	# ── mkdocs.yml ─────────────────────────────────────────────────────────────
	mkdocs_file="$component_dir/mkdocs.yml"
	if [[ -f "$mkdocs_file" ]]; then
		echo "  skip  $rel_path/mkdocs.yml (exists)"
		((skipped++)) || true
	else
		echo "  create $rel_path/mkdocs.yml"
		if [[ "$DRY_RUN" == false ]]; then
			mkdir -p "$component_dir"
			cat >"$mkdocs_file" <<EOF
site_name: $site_name
site_description: $site_description

docs_dir: docs
site_dir: site

nav:
  - Home: index.md

theme:
  name: material

markdown_extensions:
  - admonition
  - codehilite
  - toc:
      permalink: true
EOF
		fi
		((created++)) || true
	fi

done

echo ""
echo "Done. created=$created skipped=$skipped errors=$errors"
if ((errors > 0)); then
	exit 1
fi
