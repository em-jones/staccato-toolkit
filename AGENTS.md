# Agent guidelines

- **ALWAYS** respond to prompts ending with `?` with an answer OR a clarification inquiry before
  providing an answer.
- **ALWAYS** use the question tool to ask for clarification if there is more than one question being
  asked.
- **ALWAYS** translate `@tanstack/react-*` as `@tanstack/solid-*`
- **ALWAYS** translate `@tanstack/*-react` as `@tanstack/*-solid`
- **ALWAYS** use `jcodemunch` mcp to navigate codebases (local or remote)
- **ALWAYS** use `jdocsmunch` mcp to navigate documentation (local or remote)
- **IMPORTANT** If you see that you're working on any of these keywords, **ignore directories that
  aren't ./dev-portal, ./.agents, ./openspec/ or ./.opencode**
  - portal
  - dev portal
  - openportal
  - op

## During implementation **important**

**IMPORTANT** when instructed to perform tasks, **ALWAYS**:

1. At conversation/session start(or after clear) use `td usage --new-session`

   This tells you:
   - Active work sessions and recent decisions
   - Issues pending review (you can review these)
   - Highest priority open issues
   - Recent handoffs from previous sessions
   - Rotates sessions

2. Use the `td-task-management` skill to perform work and track progress.
   - **NEVER MODIFY FILES IN THE .gitignore paths**
   - **When writing summaries, be minimally verbose, but let the developer ask for reiteration with
     more verbosity**

3. We give preference to using `bun` in place of `node/npm` when possible
