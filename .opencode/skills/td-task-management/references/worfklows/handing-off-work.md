# Handing off work

- single issue:

```bash
td handoff <id> \ # IF using work session, use `td ws handoff` instead
  --done "OAuth flow, token storage" \
  --remaining "Refresh token rotation, error handling" \
  --decision "Using JWT for stateless auth" \
  --uncertain "Should tokens expire on password change?"
```

Keys:

- `--done` - What's actually complete (be honest)
- `--remaining` - What's left (be specific)
- `--decision` - Why you chose approach X
- `--uncertain` - What you're unsure about

Next session will see all this context with `td usage` or `td context <id>`.
