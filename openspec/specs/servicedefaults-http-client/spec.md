---
td-board: go-service-defaults-servicedefaults-http-client
td-issue: td-bc34da
---

# Specification: Service Defaults — HTTP Client Defaults

## Overview

Defines the `NewHTTPClient()` helper that returns an `*http.Client` with OTel transport instrumentation and configurable timeouts. Ensures all outbound HTTP calls automatically create spans and propagate trace context.

## ADDED Requirements

### Requirement: NewHTTPClient helper with OTel transport

The package SHALL export a `NewHTTPClient(opts ...ClientOption) *http.Client` function. It MUST return an `*http.Client` with `otelhttp.NewTransport(http.DefaultTransport)` as the Transport. This automatically creates spans for outbound HTTP calls and propagates W3C TraceContext headers.

#### Scenario: Outbound HTTP call creates span

- **WHEN** a service uses `servicedefaults.NewHTTPClient()` to make a GET request
- **THEN** an OpenTelemetry span is created with `http.method=GET`, `http.url`, and `http.status_code` attributes
- **AND** the `traceparent` header is included in the request

### Requirement: Configurable timeouts via ClientOption

The `NewHTTPClient()` function SHALL accept variadic `ClientOption` functional options. It MUST support `WithTimeout(duration)` to set `http.Client.Timeout`. Default timeout SHALL be 30 seconds.

#### Scenario: Custom timeout configured

- **WHEN** a service calls `NewHTTPClient(WithTimeout(5 * time.Second))`
- **THEN** the returned client has a 5-second timeout

### Requirement: Configurable retry behavior via ClientOption

The package SHALL support a `WithRetry(maxRetries int, backoff time.Duration)` option. It MUST wrap the transport with retry logic for transient failures (5xx status codes, network errors). Default SHALL be no retries.

#### Scenario: Retry on 503 Service Unavailable

- **WHEN** a service uses `NewHTTPClient(WithRetry(3, 100*time.Millisecond))` and the server returns 503
- **THEN** the client retries up to 3 times with 100ms backoff between attempts

### Requirement: Configurable TLS via ClientOption

The package SHALL support a `WithTLSConfig(*tls.Config)` option to override the default TLS configuration. This allows services to configure custom CA certificates or skip verification in dev environments.

#### Scenario: Custom CA certificate for internal services

- **WHEN** a service calls `NewHTTPClient(WithTLSConfig(customTLSConfig))`
- **THEN** the client uses the provided TLS configuration for HTTPS requests

### Requirement: Default User-Agent header

The HTTP client MUST set a default `User-Agent` header in the format `staccato-toolkit/<service-name>/<version>`. Services MAY override this via standard `http.Header` manipulation.

#### Scenario: User-Agent header identifies service

- **WHEN** a service configured with `Configure(ctx, "staccato-server")` makes an HTTP request
- **THEN** the request includes `User-Agent: staccato-toolkit/staccato-server/dev`

## MODIFIED Requirements

_None - this is a new capability_

## REMOVED Requirements

_None_
