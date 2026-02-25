# OQA Errors

Error signal types and utilities.

## Alignment with OQA Ecosystem Spec

Implements the **Error Signal** requirement - conditions representing failures, exceptions, and fault states.

### Error Signal Definition

Derived from OTel primitives:

- Aggregates OTel log records with severity >= ERROR
- Counter metrics for error counts
- Includes: error_type, service_name, timestamp, stack_trace

### Severity Levels

- critical: System-wide failures requiring immediate attention
- major: Significant errors affecting specific services
- minor: Non-critical errors and warnings
