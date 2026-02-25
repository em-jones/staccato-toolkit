# @op-plugin/events-s2

S2 event stream plugin with in-memory fallback for the open portal platform.

## Overview

This plugin implements the `EventStream` interface from `@op/platform/events` using the S2 streaming protocol. It attempts to connect to an S2 server on initialization and gracefully falls back to an in-memory event bus when S2 is unavailable, ensuring local development works without external services.

## Features

- **S2 Integration**: Connects to S2 streaming server for production event delivery
- **In-Memory Fallback**: Automatically falls back to `InMemoryEventBus` when S2 is unavailable
- **Connection Timeout**: Configurable timeout prevents blocking startup
- **Graceful Degradation**: Falls back to in-memory if S2 publish/subscribe fails at runtime
- **OpenTelemetry Metrics**: Tracks event subscriptions via UpDownCounter

## Configuration

```typescript
import { createEventStream } from "@op-plugin/events-s2";

const eventStream = createEventStream(
  {
    endpoint: process.env.S2_ENDPOINT ?? "http://localhost:9092",
    apiKey: process.env.S2_API_KEY,
    basin: process.env.S2_BASIN,
    timeoutMs: 3000,
  },
  logger,
  meterBuilder,
);
```

## Development

- Install dependencies:

```bash
vp install
```

- Run the unit tests:

```bash
vp test
```

- Build the library:

```bash
vp pack
```

## Architecture

The plugin follows the strategy pattern:

1. On `init()`, attempts S2 connection with configurable timeout
2. If connection fails, logs warning and uses `InMemoryEventBus`
3. If connection succeeds, routes publish/subscribe through S2
4. If S2 operations fail at runtime, degrades to in-memory fallback
5. On `close()`, cleans up both S2 subscriptions and in-memory handlers
