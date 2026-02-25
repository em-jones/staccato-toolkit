# Reviewing work

**Important:** You cannot approve work you implemented. Session isolation enforces this.

```bash
# 1. See reviewable issues
td reviewable

# 2. Check details
td show <id>
td context <id>

# 3. Approve or reject
td approve <id>
# Or:
td reject <id> --reason "Missing error handling"
```
