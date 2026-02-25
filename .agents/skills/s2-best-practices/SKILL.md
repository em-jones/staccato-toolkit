# S2 Best Practices

This skill provides guidance for using and configuring S2, a streaming data platform.

## Overview

S2 is a managed streaming data platform that provides real-time data ingestion, processing, and querying capabilities. This skill covers:

- S2 CLI usage
- Access token management
- Basin and stream configuration
- Declarative spec files
- Integration patterns

## Installation

### CLI Installation

```bash
# Install the S2 CLI
curl -sSfL https://install.s2.dev | sh

# Or use Homebrew (macOS)
brew install s2dev/s2/s2

# Verify installation
s2 --version
```

### SDK Installation

Choose the appropriate SDK for your language:

- JavaScript/TypeScript: `npm install @s2dev/sdk`
- Python: `pip install s2-sdk`
- Go: `go get github.com/s2dev/sdk-go`
- Rust: `cargo add s2-sdk`

## Configuration

### CLI Configuration

Configure the S2 CLI with your API endpoint and authentication:

```bash
# Set the API endpoint
s2 config set api.endpoint https://api.s2.dev

# Set default output format
s2 config set output.format json

# Enable/disable verbose logging
s2 config set log.level info
```

Configuration is stored in `~/.config/s2/config.yaml`.

### Access Token Management

Access tokens provide authentication to S2 APIs:

```bash
# Issue a new access token
s2 access-tokens issue --name "my-token" --expires-in 720h

# List existing access tokens
s2 access-tokens list

# Revoke an access token
s2 access-tokens revoke <token-id>
```

Tokens should be stored securely and rotated regularly.

## Core Concepts

### Basins

Basins are containers for streams that provide isolation and resource boundaries:

```bash
# Create a new basin
s2 basins create --name "my-basin" --description "Development basin"

# List basins
s2 basins list

# Get basin configuration
s2 basins get-config my-basin

# Delete a basin
s2 basins delete my-basin
```

### Streams

Streams are unbounded sequences of records within a basin:

```bash
# Create a new stream
s2 streams create --basin my-basin --name "events" --schema '{"type":"record","name":"Event","fields":[{"name":"id","type":"string"},{"name":"timestamp","type":"long"},{"name":"data","type":"string"}]}'

# List streams in a basin
s2 streams list --basin my-basin

# Get stream configuration
s2 streams get-config my-basin events

# Delete a stream
s2 streams delete my-basin events
```

### Records

Records are the fundamental units of data in S2 streams:

```bash
# Append records to a stream
echo '{"id": "1", "timestamp": 1234567890, "data": "test"}' | s2 append my-basin events

# Read records from a stream
s2 read my-basin events --limit 10

# Check the tail position of a stream
s2 check-tail my-basin events
```

## Declarative Configuration

Define basins and streams using declarative spec files:

```yaml
# s2-spec.yaml
basins:
  - name: production
    description: Production workloads
    streams:
      - name: user-events
        schema:
          type: record
          name: UserEvent
          fields:
            - name: userId
              type: string
            - name: action
              type: string
            - name: timestamp
              type: long
      - name: system-metrics
        schema:
          type: record
          name: SystemMetric
          fields:
            - name: service
              type: string
            - name: metric
              type: string
            - name: value
              type: double
            - name: timestamp
              type: long

  - name: development
    description: Development and testing
    streams:
      - name: debug-logs
        schema:
          type: record
          name: DebugLog
          fields:
            - name: level
              type: string
            - name: message
              type: string
            - name: timestamp
              type: long
```

Apply the spec:

```bash
s2 apply -f s2-spec.yaml
```

## Integrations

### OpenTelemetry

Export metrics and traces to S2 using the OpenTelemetry integration:

```bash
# Configure OTLP exporter to point to S2
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.s2.dev:4317"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <access-token>"

# Run your application with OpenTelemetry instrumentation
```

### Terraform Provider

Manage S2 resources with Terraform:

```hcl
# Configure the S2 provider
provider "s2" {
  api_endpoint = "https://api.s2.dev"
  access_token = var.s2_access_token
}

# Create a basin
resource "s2_basin" "example" {
  name        = "example-basin"
  description = "Example basin for Terraform"
}

# Create a stream
resource "s2_stream" "example" {
  basin_id  = s2_basin.example.id
  name      = "example-stream"
  schema    = <<SCHEMA
{
  "type": "record",
  "name": "ExampleRecord",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "data", "type": "string"}
  ]
}
SCHEMA
}
```

### Vercel AI SDK

Stream AI-generated content with S2:

```javascript
import { S2Stream } from "@s2dev/vercel-ai-sdk";

// Create a stream for AI responses
const stream = new S2Stream({
  basin: "ai-basin",
  stream: "llm-responses",
  accessToken: process.env.S2_ACCESS_TOKEN,
});

// Write AI-generated tokens to the stream
for await (const token of llm.stream()) {
  await stream.write({ token, timestamp: Date.now() });
}
```

## Best Practices

### Security

1. Use short-lived access tokens with specific permissions
2. Store tokens in secure secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)
3. Enable audit logging for basin and stream operations
4. Use network policies to restrict access to trusted IPs

### Performance

1. Size basins appropriately based on expected throughput
2. Use partitioning in stream schemas for better scalability
3. Monitor consumer lag and adjust consumer group sizes
4. Use batch operations for appending records when possible

### Reliability

1. Enable durability guarantees for critical streams
2. Implement dead letter queues for failed record processing
3. Use schema evolution strategies to maintain backward compatibility
4. Set appropriate retention policies based on data value

### Monitoring

1. Track basin-level and stream-level metrics regularly
2. Set up alerts for throughput drops or latency spikes
3. Monitor consumer group lag for streaming applications
4. Audit access token usage periodically

## Troubleshooting

### Common Issues

1. **Authentication failures**: Verify access token validity and permissions
2. **Stream not found**: Check basin name and stream name spelling
3. **Schema validation errors**: Ensure record schema matches stream configuration
4. **Connection timeouts**: Verify network connectivity and API endpoint

### Debug Commands

```bash
# Enable verbose logging for troubleshooting
s2 --verbose streams list --basin my-basin

# Check API connectivity
s2 ping

# View current configuration
s2 config list

# Get detailed error information
s2 streams get-config my-basin problematic-stream --output yaml
```

## References

- [S2 Documentation](https://s2.dev/docs)
- [API Reference](https://s2.dev/docs/api-reference)
- [CLI Reference](https://s2.dev/docs/cli/overview)
- [SDK Guides](https://s2.dev/docs/sdk/languages)
- [Integrations](https://s2.dev/docs/integrations/overview)
