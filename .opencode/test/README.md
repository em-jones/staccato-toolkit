# Agent unit tests

**NOTE**: These are only to be run when requested by an end-user Generate a report of unit tests for
the agent.

**ALWAYS**: If any fail, create a td-task for future investigation. That task should belong to the
`agent-test-issues` `td` `epic`

**ALWAYS**: Write a test report using the following format:

You should **NEVER** lie about the status of a test execution

```md
# Agent Unit Test Report

## Details

### Test Failure 1: [Test Name]

- **Description**: [Brief description of the test]
- **Failure Reason**: [If failed, provide details on why it failed]

## Summary

- Total Tests: X
- Passed: Y
- Failed: Z
```

**ALWAYS**: use `test_history.json` to track test results over time in order to detect patterns of
failure and identify areas for improvement in the agent's codebase.
