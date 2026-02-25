# Trace Sampling Strategy Usage Rules

**Domain**: Distributed trace sampling for cost management and visibility

**Adopted by**: adopt-tempo-tracing (see `.opencode/changes/adopt-tempo-tracing/design.md`)

---

## Overview

Trace sampling reduces the volume of traces exported to Tempo, managing storage costs while maintaining visibility into errors and slow requests. This rule documents probabilistic head sampling, tail-based sampling rules, per-service configuration, and critical path overrides.

---

## Sampling Architecture

### Head Sampling

Sampling decision made at trace entry point (e.g., HTTP handler). Uses probabilistic sampling based on a configurable rate.

- **Pros**: Low latency overhead, simple, decisions made early
- **Cons**: Loses all visibility into infrequent errors and low-probability issues

### Tail Sampling

Sampling decision made after all spans in a trace are collected, based on trace characteristics (errors, latency). Spans are kept in memory briefly then either exported or dropped.

- **Pros**: Always captures errors and slow requests regardless of head sampling
- **Cons**: Requires buffering; slight latency overhead

### Hybrid Approach (Recommended)

Use both:
1. **Head sampling**: 10% probabilistic sampling reduces baseline volume
2. **Tail sampling**: 100% sampling for error traces and high-latency traces

Result: ~10% baseline + 100% of errors and slow requests = optimal visibility-to-cost ratio.

---

## Head Sampling Configuration

### Default Sampling Rate

```bash
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
```

### Service-Specific Overrides

Services MAY override the default 10% rate:

| Service Category | Sampling Rate | Use Case | Env Var |
|------------------|---------------|----------|---------|
| Critical paths | 1.0 (100%) | Auth, payments, checkout | `AUTH_SAMPLING_RATE=1.0` |
| Background jobs | 0.05 (5%) | Batch processing, cleanup | `BACKGROUND_SAMPLING_RATE=0.05` |
| Data processing | 0.01 (1%) | ETL, heavy computation | `ETL_SAMPLING_RATE=0.01` |
| Default (API) | 0.1 (10%) | HTTP API handlers | `OTEL_TRACES_SAMPLER_ARG=0.1` |

### Implementation

```go
import (
    "os"
    "strconv"
    "go.opentelemetry.io/otel/sdk/trace"
)

func newSampler() trace.Sampler {
    rateStr := os.Getenv("OTEL_TRACES_SAMPLER_ARG")
    if rateStr == "" {
        rateStr = "0.1"  // default 10%
    }
    
    rate, _ := strconv.ParseFloat(rateStr, 64)
    return trace.TraceIDRatioBased(rate)
}
```

---

## Tail Sampling Rules

Tail sampling rules automatically sample (override head sampling) for traces with:

1. **Errors**: Any span with status ERROR or an exception event
2. **Latency**: Trace duration > 5 seconds
3. **Custom rules**: (future) Specific span attributes, business metrics, etc.

### Rule 1: Error Traces

```
IF trace contains span with status=ERROR OR exception event
THEN sample trace
```

**Result**: 100% of error traces are exported, even if dropped at head.

### Rule 2: Latency Traces

```
IF trace duration > 5 seconds
THEN sample trace
```

**Rationale**: Long-running requests are often worth investigating; always sample them.

**Configuration**:
```bash
export TAIL_SAMPLING_LATENCY_THRESHOLD_MS=5000
```

### Rule 3: Custom Sampling (Future)

Future tail sampling may include:
- Specific business logic (e.g., traces from VIP customers always sampled)
- Span attribute patterns (e.g., all spans matching `payment.*`)
- Span count (e.g., traces with > N spans)

---

## Tail Sampling Implementation

Tail sampling is implemented in the collector or exporter. OTel SDKs support local tail sampling via sampling processor.

### Go SDK Example (Local Tail Sampling)

```go
import (
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func newTracerProvider() (*sdktrace.TracerProvider, error) {
    // Head sampler (probabilistic)
    headSampler := trace.TraceIDRatioBased(0.1)
    
    // Tail sampler (custom logic)
    tailSampler := &CustomTailSampler{}
    
    // Composite sampler: head + tail
    sampler := newHybridSampler(headSampler, tailSampler)
    
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithSampler(sampler),
        // ... other options
    )
    
    return tp, nil
}

type CustomTailSampler struct{}

func (s *CustomTailSampler) ShouldSample(p sdktrace.SamplingParameters) sdktrace.SamplingResult {
    // Always sample error traces
    for _, event := range p.SpanEvents {
        if event.Name == "exception" {
            return sdktrace.SamplingResult{Decision: sdktrace.RecordAndSample}
        }
    }
    
    // Always sample high-latency traces (checked at export time)
    // Note: This is a simplified example; full latency checks happen in exporter
    
    return sdktrace.SamplingResult{Decision: sdktrace.Drop}
}
```

---

## Sampling Decision Propagation

### Child Span Sampling

Child spans **always** inherit the parent trace's sampling decision. Once a trace is sampled (or not), all child spans follow the same decision.

```go
// If parent trace is sampled, all child spans are sampled
ctx, parentSpan := tracer.Start(ctx, "parent")  // sampled=true
defer parentSpan.End()

// This child automatically inherits sampled=true
_, childSpan := tracer.Start(ctx, "child")
defer childSpan.End()
```

### Distributed Propagation

In a distributed system, the sampling decision is propagated via the `traceparent` header (W3C Trace Context).

Format: `traceparent: 00-<trace-id>-<span-id>-<trace-flags>`

The last byte (`trace-flags`) includes the `sampled` bit (0x01):
- `01` = sampled (trace is recorded)
- `00` = not sampled (trace is dropped)

Downstream services honor this flag:

```go
// Service A: Head sampling decides (10% probability)
// traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01 (sampled)

// Service B: Receives traceparent, honors the sampled flag
ctx := propagator.Extract(r.Context(), propagation.HeaderCarrier(r.Header))
// ctx contains sampled=true; all spans created from this context are sampled
```

---

## Sampling Configuration and Monitoring

### Exported Metrics

Export and monitor sampling statistics:

```go
// Percentage of traces sampled (head sampling)
otel.Meter("observability").CreateObservableGauge(
    "traces.sampled.percentage",
    func(ctx context.Context, observer metric.Observer) error {
        observer.ObserveFloat64(10.0)  // 10% sampled
        return nil
    },
)

// Tail sampling events (error/latency overrides)
counter, _ := otel.Meter("observability").Int64Counter(
    "traces.tail_sampled.total",
    metric.WithDescription("Traces sampled by tail rules (errors, latency)"),
)
```

### Configuration Changes

Log configuration changes at startup:

```go
logger.Info("sampling configured",
    "head_sampler_rate", 0.1,
    "tail_sample_error_traces", true,
    "tail_sample_latency_threshold_ms", 5000,
)
```

---

## Per-Service Sampling Strategies

### Critical Paths (Auth, Payments)

```bash
# Authentication service
export SERVICE_NAME=auth-service
export OTEL_TRACES_SAMPLER=always_on  # 100% sampling

# Payment processor
export SERVICE_NAME=payment-processor
export OTEL_TRACES_SAMPLER=always_on  # 100% sampling
```

**Rationale**: Authentication and payment failures are security-sensitive and must be fully visible.

### Background Jobs

```bash
# Batch processing
export SERVICE_NAME=batch-processor
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.05  # 5% sampling
```

**Rationale**: Background jobs are high-volume but low-cost; 5% sampling is sufficient to detect issues.

### Data Processing (ETL)

```bash
# ETL pipeline
export SERVICE_NAME=etl-service
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.01  # 1% sampling
```

**Rationale**: ETL traces are very high-volume; 1% sampling reduces storage while tail sampling captures errors.

### Default API Services

```bash
# REST API
export SERVICE_NAME=api-service
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling (default)
```

---

## Sampling Validation

### Testing Sampling Behavior

```go
func TestSamplingRate(t *testing.T) {
    tracer := initTracer(0.1)  // 10% sampling
    
    // Generate 100 traces
    sampled := 0
    for i := 0; i < 100; i++ {
        ctx, span := tracer.Start(context.Background(), "test")
        if span.SpanContext().TraceFlags().IsSampled() {
            sampled++
        }
        span.End()
    }
    
    // Expect approximately 10% sampled
    if sampled < 5 || sampled > 15 {
        t.Errorf("expected ~10 sampled, got %d", sampled)
    }
}
```

### Monitoring Sampling Rate

Check that actual sampling rates match configuration:

```bash
# Prometheus query
sum(rate(traces_sampled_total[5m])) / sum(rate(traces_received_total[5m]))
# Should be close to configured rate (e.g., 0.1 for 10%)
```

---

## Sampling Decision Conflicts

### Conflict: Head Sampling vs. Tail Sampling

**Scenario**: Head sampler drops trace (90% probability), but tail sampler wants to sample it (error occurred).

**Resolution**: Tail sampler's decision takes precedence. Error and latency rules override head sampling.

### Conflict: Per-Service Override vs. Default

**Scenario**: Default is 10%, but a service sets `OTEL_TRACES_SAMPLER=always_on`.

**Resolution**: Per-service override takes precedence. The service's configured sampler is used.

---

## Troubleshooting

### Issue: Missing Error Traces

**Symptom**: Error traces are not appearing in Tempo even though errors occurred.

**Cause**: Head sampling dropped the trace before tail sampler could override (if tail sampling not configured).

**Solution**: Enable tail sampling for errors; verify tail sampler is active.

### Issue: High Trace Volume

**Symptom**: Tempo ingestion exceeds rate limit; traces are rejected.

**Cause**: Sampling rate is too high (e.g., 50% instead of 10%).

**Solution**: Reduce sampling rate; ensure tail sampling is not creating excessive overrides.

### Issue: Insufficient Visibility

**Symptom**: Low-probability errors (occur 1/10000 times) are never sampled.

**Cause**: Head sampling alone cannot capture rare events.

**Solution**: Enable tail sampling for errors; enable custom business logic sampling if needed.

---

## Examples

### Sampling Configuration Checklist

- [ ] Default head sampling rate: 10% (`OTEL_TRACES_SAMPLER_ARG=0.1`)
- [ ] Critical paths override: 100% (`AUTH_SAMPLING_RATE=1.0`)
- [ ] Background jobs: 5% (`BACKGROUND_SAMPLING_RATE=0.05`)
- [ ] ETL/bulk: 1% (`ETL_SAMPLING_RATE=0.01`)
- [ ] Tail sampling for errors: enabled
- [ ] Tail sampling for latency > 5s: enabled
- [ ] Monitoring metrics exported: `traces.sampled.percentage`, `traces.tail_sampled.total`
- [ ] Configuration changes logged at startup

---

## Related

- **Design**: `openspec/changes/adopt-tempo-tracing/design.md`
- **Specification**: `openspec/changes/adopt-tempo-tracing/specs/trace-sampling-strategy/spec.md`
- **OTel Sampling**: https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampler
