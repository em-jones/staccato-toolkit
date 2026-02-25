# td quick reference

## Common commands

### Issue management

- `td create "title" --type feature --priority P1` - Create issue
- `td list` - List all issues
- `td list --status in_progress` - Filter by status
- `td show <id>` - View issue details
- `td next` - Highest priority open issue
- `td critical-path` - What unblocks the most work
- `td reviewable` - Issues you can review

### File tracking

- `td link <id> <files...>` - Track files with an issue
- `td files <id>` - Show file changes (modified, new, deleted, unchanged)

### Other

- `td context <id>` - Full context for resuming
- `td monitor` - Live dashboard of activity
- `td session --new "name"` - Force new named session
- `td undo` - Undo last action
- `td block <id>` - Mark issue as blocked
- `td delete <id>` - Delete issue
