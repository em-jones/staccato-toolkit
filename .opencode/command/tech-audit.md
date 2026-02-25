---
name: tech-audit
description:
  Run a technology audit — surface any tool, library, framework, pattern, or component in use that
  lacks a change, usage rule, ADR, or catalog entity.
---

Load the `technology-audit` skill and execute it. All workflow logic, step sequencing, output
format, and guardrails live in the skill.

```
skill: technology-audit
```

**Argument parsing** (set before following the skill):

| Argument                                    | Effect                                   |
| ------------------------------------------- | ---------------------------------------- |
| _(none)_                                    | `$SCOPE=all`, `$PATH=.`                  |
| `code` \| `catalog` \| `rules` \| `changes` | `$SCOPE=<arg>`, `$PATH=.`                |
| any other value                             | `$SCOPE=all`, `$PATH=<arg>`              |
| scope keyword + path                        | `$SCOPE=<keyword>`, `$PATH=<second arg>` |
