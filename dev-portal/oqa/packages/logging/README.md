# OQA Logging

Logging utilities and OpenTelemetry log integration.

## Alignment with OQA Ecosystem Spec

Implements the **OTel logs integration** requirement - all compliance events logged MUST conform to OTel Log Record attributes.

### Log Record Attributes

- timestamp: Time of the log event
- severity: Trace severity (DEBUG, INFO, WARN, ERROR, FATAL)
- service.name: Source service
- body: Log message
- attributes: Custom metadata

### Compliance Event Logging

Logs are correlated with:

- Performance signals (latency threshold breaches)
- Error signals (error condition detection)
- Incident signals (incident state changes)
