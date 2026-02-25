# Multi issue workflow commands

- Begin work: `td ws start "session name"`
- Associate issues: `td ws tag <id1> <id2>` (starts open issues)
- Associate without starting: `td ws tag --no-start <id>`
- Log to all tagged issues: `td ws log "message"`
- Log to specific issue: `td ws log --only <id> "message"`
- Log decision: `td ws log --decision "chose X because Y"`
- Log blocker: `td ws log --blocker "stuck on X"`
- Log hypothesis: `td ws log --hypothesis "if we do X, then Y will happen"`
- Log attempted approach: `td ws log --tried "tried X, but it didn't work because Y"`
- Log result: `td ws log --result "approach X resulted in Y"`
- Capture state and end session: `td ws handoff`
