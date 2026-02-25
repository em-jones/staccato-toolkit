# Agent guidelines

**ALWAYS** start work by running `devbox shell` in the directory relevant to the work to be
performed.

## Scripting best practices

- When using a command from the following list and when possible, make use of `yq`:
  - `kubectl` / `k` (use flag -o yaml)

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
