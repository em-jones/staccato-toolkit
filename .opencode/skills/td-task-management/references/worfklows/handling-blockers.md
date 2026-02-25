# Handling blockers

```bash
# 1. Log the blocker
td log --blocker "Waiting on API spec from backend team"

# 2. Work on something else
td next              # Get another issue
td ws tag td-e5f6   # Add to work session

# 3. Come back to blocked issue later
td context td-a1b2  # Refresh context when blocker resolves
```
