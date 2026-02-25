#!/usr/bin/env bash

# Migrate Tech Radar tables from design.md body to frontmatter
# For each design.md file with a ## Tech Radar table:
# 1. Parse the table rows
# 2. Convert to tech-radar frontmatter entries
# 3. Add tech-radar block to frontmatter
# 4. Remove ## Tech Radar section from body

set -euo pipefail

# Normalize quadrant names
normalize_quadrant() {
	local quadrant="$1"
	case "$quadrant" in
	"Languages & Frameworks") echo "Frameworks/Libraries" ;;
	"Platforms") echo "Infrastructure" ;;
	*) echo "$quadrant" ;;
	esac
}

# Process a single file
migrate_file() {
	local file="$1"

	echo "Processing: $file"

	# Check if file has ## Tech Radar section
	if ! grep -q "^## Tech Radar" "$file"; then
		echo "  ⏭️  No Tech Radar section found, skipping"
		return 0
	fi

	# Create temp files (declare and assign separately to catch errors)
	local tmpfile
	local frontmatter_file
	local body_file
	local tech_radar_file
	tmpfile=$(mktemp)
	frontmatter_file=$(mktemp)
	body_file=$(mktemp)
	tech_radar_file=$(mktemp)

	# Extract frontmatter (between first and second ---)
	awk '/^---$/ {count++; if (count == 2) exit} count == 1 && !/^---$/ {print}' "$file" >"$frontmatter_file"

	# Extract body (after second ---)
	awk '/^---$/ {count++; next} count >= 2 {print}' "$file" >"$body_file"

	# Extract Tech Radar table section
	awk '/^## Tech Radar$/,/^## [^T]/ {print}' "$body_file" | grep "^|" | grep -v "Technology.*Quadrant" | grep -v "^|--" >"$tech_radar_file" || true

	# Check if we have any entries
	if [ ! -s "$tech_radar_file" ]; then
		echo "  ⏭️  No Tech Radar table entries found, skipping"
		rm -f "$tmpfile" "$frontmatter_file" "$body_file" "$tech_radar_file"
		return 0
	fi

	# Build tech-radar YAML block
	echo "tech-radar:" >>"$tmpfile"

	local valid_entries=0
	# Note: action and status columns are read but intentionally unused (table format)
	while IFS='|' read -r _ name quadrant ring _action rationale _status _; do
		# Trim whitespace
		name=$(echo "$name" | xargs)
		quadrant=$(echo "$quadrant" | xargs)
		ring=$(echo "$ring" | xargs)
		rationale=$(echo "$rationale" | xargs)

		# Skip rows where Technology is — or Ring is review-only
		if [ "$name" = "—" ] || [ "$ring" = "review-only" ] || [ "$ring" = "—" ]; then
			continue
		fi

		# Normalize quadrant
		quadrant=$(normalize_quadrant "$quadrant")

		# Add entry (use group redirect for efficiency)
		{
			echo "  - name: $name"
			echo "    quadrant: $quadrant"
			echo "    ring: $ring"
			echo "    description: $rationale"
			echo "    moved: 0"
		} >>"$tmpfile"

		((valid_entries++))
	done <"$tech_radar_file"

	if [ "$valid_entries" -eq 0 ]; then
		echo "  ⏭️  No valid Tech Radar entries found (all were — or review-only), skipping"
		rm -f "$tmpfile" "$frontmatter_file" "$body_file" "$tech_radar_file"
		return 0
	fi

	echo "  ✓ Found $valid_entries Tech Radar entries"

	# Build new file (declare and assign separately)
	local output_file
	output_file=$(mktemp)

	# Write frontmatter header + existing frontmatter + tech-radar block + close + body
	{
		echo "---"
		cat "$frontmatter_file"
		cat "$tmpfile"
		echo "---"
		echo ""
	} >"$output_file"

	# Remove ## Tech Radar section from body
	awk '
    /^## Tech Radar$/ { skip=1; next }
    /^## [^T]/ && skip { skip=0 }
    !skip { print }
  ' "$body_file" >>"$output_file"

	# Write back
	cp "$output_file" "$file"

	echo "  ✅ Migrated successfully"

	# Cleanup
	rm -f "$tmpfile" "$frontmatter_file" "$body_file" "$tech_radar_file" "$output_file"
}

# Main
echo "🔍 Finding design.md files with Tech Radar tables..."
echo ""

total_migrated=0

# Find all design.md files
while IFS= read -r file; do
	if migrate_file "$file"; then
		((total_migrated++)) || true
	fi
done < <(find openspec/changes -name "design.md" 2>/dev/null)

echo ""
echo "✅ Migration complete: $total_migrated files processed"
