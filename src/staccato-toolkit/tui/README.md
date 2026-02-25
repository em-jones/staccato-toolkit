# tui

A service module within the staccato-toolkit platform.

## Building

```bash
go build ./...
```

## Running Tests

```bash
go test ./...
```

## Development

This module is part of the staccato-toolkit workspace. See the root `go.work` file for workspace configuration.

## Service Defaults

This module is configured with service defaults that provide:
- OpenTelemetry tracing
- Metrics collection
- Structured logging with OTel integration

Refer to the [core package documentation](../../../src/staccato-toolkit/core) for more details on service defaults.
