# Common single issue commands

- Begin work: `td start <id>`
- Track progress: `td log "msg"`
- Log decisions: `td log --decision "..."`
- Log blockers: `td log --blocker "..."`
- Log hypothesis: `td log --hypothesis "..."`
- Log attempted approach: `td log --tried "..."`
- Log result: `td log --result "..."`
- Capture status for handoff: `td handoff <id> --done "..." --remaining "..."`
- Submit for review: `td review <id>`
- Get next highest priority issue: `td next`
- Determine what unblocks the most work: `td critical-path`
