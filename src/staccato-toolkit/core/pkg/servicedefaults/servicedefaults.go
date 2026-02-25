package servicedefaults

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/staccato-toolkit/core/pkg/telemetry"
	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// Configure initializes all observability providers (TracerProvider, MeterProvider, LoggerProvider)
// and returns a unified shutdown function. This is the platform's equivalent of .NET Aspire's
// AddServiceDefaults().
//
// The function:
//   - Checks OTEL_SDK_DISABLED environment variable; if "true", returns no-op shutdown
//   - Initializes TracerProvider with non-blocking OTLP dial (uses reconnect period)
//   - Initializes MeterProvider with Prometheus exporter
//   - Initializes LoggerProvider with OTLP/gRPC exporter
//   - Sets global OTel providers
//   - Registers W3C TraceContext and Baggage propagators
//   - Sets slog.Default() with TraceHandler-wrapped otelslog bridge
//   - Returns unified shutdown function that tears down all providers
//
// Environment variables:
//   - OTEL_SDK_DISABLED: if "true", skips all OTel initialization
//   - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint (default: localhost:4317)
//   - OTEL_TRACES_SAMPLER: trace sampler type (default: parentbased_traceidratio)
//   - OTEL_TRACES_SAMPLER_ARG: sampling ratio (default: 0.1 = 10%)
//   - SERVICE_VERSION: service version for resource attributes (default: "dev")
//   - ENVIRONMENT: deployment environment (default: "development")
func Configure(ctx context.Context, serviceName string, opts ...Option) (shutdown func(context.Context) error, err error) {
	// Apply options
	cfg := defaultConfig()
	for _, opt := range opts {
		opt(cfg)
	}

	// Check if OTel SDK is disabled
	if os.Getenv("OTEL_SDK_DISABLED") == "true" {
		// Return no-op shutdown function
		return func(context.Context) error { return nil }, nil
	}

	// Override OTLP endpoint from environment if set
	if endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"); endpoint != "" {
		cfg.otlpEndpoint = endpoint
	}

	// Override sampler from environment if set
	if samplerType := os.Getenv("OTEL_TRACES_SAMPLER"); samplerType != "" {
		cfg.sampler = getSamplerFromEnv()
	}

	// Store service name and version for HTTP client User-Agent
	setServiceInfo(serviceName, getEnvOrDefault("SERVICE_VERSION", "dev"))

	// Create resource with service metadata
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String(getEnvOrDefault("SERVICE_VERSION", "dev")),
			semconv.DeploymentEnvironmentKey.String(getEnvOrDefault("ENVIRONMENT", "development")),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Initialize TracerProvider with non-blocking OTLP dial
	tp, err := initTracerProvider(ctx, res, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize tracer provider: %w", err)
	}

	// Initialize MeterProvider with Prometheus exporter
	mp, err := initMeterProvider(res)
	if err != nil {
		// Shutdown tracer provider if meter provider fails
		_ = tp.Shutdown(ctx)
		return nil, fmt.Errorf("failed to initialize meter provider: %w", err)
	}

	// Initialize LoggerProvider with OTLP/gRPC exporter
	lp, err := initLoggerProvider(ctx, res, cfg)
	if err != nil {
		// Shutdown tracer and meter providers if logger provider fails
		_ = tp.Shutdown(ctx)
		_ = mp.Shutdown(ctx)
		return nil, fmt.Errorf("failed to initialize logger provider: %w", err)
	}

	// Set global OTel providers
	otel.SetTracerProvider(tp)
	otel.SetMeterProvider(mp)
	global.SetLoggerProvider(lp)

	// Register W3C TraceContext and Baggage propagators for cross-service tracing
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Set up slog.Default() with TraceHandler-wrapped otelslog bridge
	// This ensures all slog calls include trace_id and span_id when in a span context
	otelHandler := otelslog.NewHandler(serviceName)
	traceHandler := telemetry.NewTraceHandler(otelHandler)
	slog.SetDefault(slog.New(traceHandler))

	// Return unified shutdown function
	shutdown = func(ctx context.Context) error {
		var errs []error

		// Shutdown providers in reverse initialization order
		// Logger provider first to flush pending logs
		if err := lp.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("logger provider shutdown: %w", err))
		}

		// Meter provider
		if err := mp.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("meter provider shutdown: %w", err))
		}

		// Tracer provider last
		if err := tp.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("tracer provider shutdown: %w", err))
		}

		if len(errs) > 0 {
			return fmt.Errorf("servicedefaults shutdown errors: %v", errs)
		}

		return nil
	}

	return shutdown, nil
}

// initTracerProvider creates and configures the TracerProvider with non-blocking OTLP/gRPC exporter.
// The key difference from telemetry.InitTelemetry is the use of WithReconnectPeriod, which makes
// the dial non-blocking - the service starts immediately even if the Collector is down.
func initTracerProvider(ctx context.Context, res *resource.Resource, cfg *config) (*sdktrace.TracerProvider, error) {
	// Create OTLP/gRPC trace exporter with non-blocking dial
	// WithReconnectPeriod enables background reconnection if the Collector is unreachable
	traceExporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(cfg.otlpEndpoint),
		otlptracegrpc.WithInsecure(),                          // Use TLS in production
		otlptracegrpc.WithReconnectionPeriod(cfg.dialTimeout), // Non-blocking dial with reconnect
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP trace exporter: %w", err)
	}

	// Create TracerProvider with configured sampler
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(cfg.sampler),
	)

	return tp, nil
}

// initMeterProvider creates and configures the MeterProvider with Prometheus exporter.
// Uses the global Prometheus registry, which can be exposed on /metrics endpoint.
func initMeterProvider(res *resource.Resource) (*metric.MeterProvider, error) {
	// Create Prometheus exporter that uses the global Prometheus registry
	metricExporter, err := prometheus.New()
	if err != nil {
		return nil, fmt.Errorf("failed to create Prometheus exporter: %w", err)
	}

	// Create MeterProvider with Prometheus exporter
	mp := metric.NewMeterProvider(
		metric.WithResource(res),
		metric.WithReader(metricExporter),
	)

	return mp, nil
}

// initLoggerProvider creates and configures the LoggerProvider with OTLP/gRPC exporter.
// Uses the same OTLP endpoint as traces.
func initLoggerProvider(ctx context.Context, res *resource.Resource, cfg *config) (*sdklog.LoggerProvider, error) {
	// Create OTLP/gRPC log exporter
	logExporter, err := otlploggrpc.New(ctx,
		otlploggrpc.WithEndpoint(cfg.otlpEndpoint),
		otlploggrpc.WithInsecure(), // Use TLS in production
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP log exporter: %w", err)
	}

	// Create LoggerProvider with batch processor
	lp := sdklog.NewLoggerProvider(
		sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)),
		sdklog.WithResource(res),
	)

	return lp, nil
}

// getSamplerFromEnv configures trace sampling based on OTEL_TRACES_SAMPLER environment variable.
// Supported values:
//   - "always_on": sample all traces (use for development only)
//   - "always_off": sample no traces
//   - "traceidratio": sample a fraction of traces (set OTEL_TRACES_SAMPLER_ARG=0.1 for 10%)
//   - "parentbased_traceidratio": respect parent sampling decision, else use traceidratio (default)
func getSamplerFromEnv() sdktrace.Sampler {
	samplerType := os.Getenv("OTEL_TRACES_SAMPLER")
	samplerArg := os.Getenv("OTEL_TRACES_SAMPLER_ARG")

	switch samplerType {
	case "always_on":
		return sdktrace.AlwaysSample()
	case "always_off":
		return sdktrace.NeverSample()
	case "traceidratio":
		ratio := parseSamplerArg(samplerArg, 0.1)
		return sdktrace.TraceIDRatioBased(ratio)
	case "parentbased_traceidratio", "":
		// Default: parent-based with 10% sampling for root spans
		ratio := parseSamplerArg(samplerArg, 0.1)
		return sdktrace.ParentBased(sdktrace.TraceIDRatioBased(ratio))
	default:
		// Fallback to default
		return sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))
	}
}

// parseSamplerArg parses the sampling ratio from OTEL_TRACES_SAMPLER_ARG.
func parseSamplerArg(arg string, defaultRatio float64) float64 {
	if arg == "" {
		return defaultRatio
	}
	var ratio float64
	if _, err := fmt.Sscanf(arg, "%f", &ratio); err != nil {
		return defaultRatio
	}
	if ratio < 0 || ratio > 1 {
		return defaultRatio
	}
	return ratio
}

// getEnvOrDefault returns the value of an environment variable or a default value.
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
