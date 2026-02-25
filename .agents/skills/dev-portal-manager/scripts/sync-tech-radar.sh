#!/usr/bin/env bash
set -euo pipefail

# sync-tech-radar.sh
# Reads tech-radar frontmatter from all design.md files and writes to docs/tech-radar.json
# Usage: bash .opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

TECH_RADAR_JSON="docs/tech-radar.json"

# Check that tech-radar.json exists
if [ ! -f "$TECH_RADAR_JSON" ]; then
	echo "ERROR: $TECH_RADAR_JSON not found" >&2
	exit 1
fi

# Single Python script to do everything
python3 <<'PYTHON_SCRIPT'
import sys
import json
import re
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not available. Please install it: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

def parse_frontmatter(content):
    """Extract YAML frontmatter from markdown file."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return {}
    
    frontmatter_text = match.group(1)
    try:
        return yaml.safe_load(frontmatter_text) or {}
    except yaml.YAMLError as e:
        print(f"YAML parse error: {e}", file=sys.stderr)
        return {}

def find_design_files():
    """Find all design.md files under openspec/changes/."""
    design_files = []
    changes_dir = Path('openspec/changes')
    if changes_dir.exists():
        design_files.extend(changes_dir.rglob('design.md'))
    return design_files

def extract_entries():
    """Extract tech-radar entries from all design.md files."""
    entries_map = {}  # name_lower -> {entry, file, date}
    
    for design_file in find_design_files():
        try:
            content = design_file.read_text()
            frontmatter = parse_frontmatter(content)
            
            # Skip files without tech-radar key or with empty list
            if 'tech-radar' not in frontmatter:
                continue
            
            tech_radar = frontmatter.get('tech-radar', [])
            if not tech_radar or not isinstance(tech_radar, list):
                continue
            
            # Get date for conflict resolution
            file_date = frontmatter.get('date', '1970-01-01')
            if not isinstance(file_date, str):
                file_date = str(file_date)
            
            # Process each entry
            for entry in tech_radar:
                if not isinstance(entry, dict):
                    continue
                
                name = entry.get('name', '')
                if not name:
                    continue
                
                name_lower = name.lower()
                
                # Check for conflicts
                if name_lower in entries_map:
                    existing = entries_map[name_lower]
                    existing_date = existing['date']
                    
                    # Compare dates
                    if file_date > existing_date:
                        # Current file is newer, replace
                        print(f"WARNING: Duplicate entry '{name}' found in {design_file} (ring: {entry.get('ring')}) and {existing['file']} (ring: {existing['entry'].get('ring')}). Using {design_file} (more recent: {file_date} > {existing_date}).", file=sys.stderr)
                        entries_map[name_lower] = {
                            'entry': entry,
                            'file': str(design_file),
                            'date': file_date
                        }
                    else:
                        # Existing is newer or same, keep existing
                        print(f"WARNING: Duplicate entry '{name}' found in {design_file} (ring: {entry.get('ring')}) and {existing['file']} (ring: {existing['entry'].get('ring')}). Using {existing['file']} (more recent: {existing_date} >= {file_date}).", file=sys.stderr)
                else:
                    # New entry
                    entries_map[name_lower] = {
                        'entry': entry,
                        'file': str(design_file),
                        'date': file_date
                    }
        
        except Exception as e:
            print(f"ERROR: Failed to process {design_file}: {e}", file=sys.stderr)
            continue
    
    # Extract just the entries
    entries = []
    for name_lower, data in entries_map.items():
        entry = data['entry'].copy()
        # Ensure moved field exists and is numeric
        if 'moved' not in entry:
            entry['moved'] = 0
        # Ensure description is a string (handle multi-line)
        if 'description' in entry:
            entry['description'] = str(entry['description']).strip()
        entries.append(entry)
    
    return entries

def merge_and_write():
    """Merge new entries with existing tech-radar.json and write result."""
    # Read existing tech-radar.json
    with open('docs/tech-radar.json', 'r') as f:
        existing = json.load(f)
    
    # Extract new entries
    new_entries = extract_entries()
    
    # Build map of existing entries by lowercase name
    existing_map = {}
    for entry in existing.get('entries', []):
        existing_map[entry['name'].lower()] = entry
    
    # Track changes
    added = 0
    updated = 0
    unchanged = 0
    
    # Process new entries
    new_entries_map = {}
    for entry in new_entries:
        name_lower = entry['name'].lower()
        new_entries_map[name_lower] = entry
        
        if name_lower in existing_map:
            # Check if entry changed
            old_entry = existing_map[name_lower]
            if (old_entry.get('quadrant') != entry.get('quadrant') or
                old_entry.get('ring') != entry.get('ring') or
                old_entry.get('description') != entry.get('description') or
                old_entry.get('moved') != entry.get('moved', 0)):
                updated += 1
            else:
                unchanged += 1
        else:
            added += 1
    
    # Build final entries list (preserve existing entries not in new list)
    final_entries = []
    for entry in new_entries:
        final_entries.append(entry)
    
    # Add existing entries that weren't in new list
    for name_lower, entry in existing_map.items():
        if name_lower not in new_entries_map:
            final_entries.append(entry)
    
    # Update existing structure with new entries
    existing['entries'] = final_entries
    
    # Write merged result
    with open('docs/tech-radar.json', 'w') as f:
        json.dump(existing, f, indent=2)
        f.write('\n')  # Add trailing newline
    
    # Print summary
    print(f"{added} added, {updated} updated, {unchanged} unchanged")

# Main execution
merge_and_write()
PYTHON_SCRIPT

echo "Tech radar sync complete."
