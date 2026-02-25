package telemetry

import (
	"context"
	"fmt"
	"os"

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

// InitTelemetry initializes OpenTelemetry TracerProvider, MeterProvider, and LoggerProvider
// for a service. It returns a shutdown function that must be called to
// flush and shutdown all providers before the application exits.
//
// TracerProvider exports traces via OTLP/gRPC to the OpenTelemetry Collector.
// The endpoint is configurable via OTEL_EXPORTER_OTLP_ENDPOINT env var
// (default: localhost:4317).
//
// MeterProvider exports metrics via Prometheus exporter using the global
// Prometheus registry, which can be exposed on the service's /metrics endpoint.
//
// LoggerProvider exports logs via OTLP/gRPC to the OpenTelemetry Collector
// using the same endpoint as traces. Use with go.opentelemetry.io/contrib/bridges/otelslog
// to bridge log/slog to the OTel logs signal.
func InitTelemetry(ctx context.Context, serviceName string) (shutdown func(context.Context) error, err error) {
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

	// Initialize TracerProvider
	tp, err := initTracerProvider(ctx, res)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize tracer provider: %w", err)
	}

	// Initialize MeterProvider
	mp, err := initMeterProvider(res)
	if err != nil {
		// Shutdown tracer provider if meter provider fails
		_ = tp.Shutdown(ctx)
		return nil, fmt.Errorf("failed to initialize meter provider: %w", err)
	}

	// Initialize LoggerProvider
	lp, err := initLoggerProvider(ctx, res)
	if err != nil {
		// Shutdown tracer and meter providers if logger provider fails
		_ = tp.Shutdown(ctx)
		_ = mp.Shutdown(ctx)
		return nil, fmt.Errorf("failed to initialize logger provider: %w", err)
	}

	// Set global providers
	otel.SetTracerProvider(tp)
	otel.SetMeterProvider(mp)
	global.SetLoggerProvider(lp)

	// Register W3C TraceContext propagator for cross-service tracing
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Return combined shutdown function
	shutdown = func(ctx context.Context) error {
		var errs []error

		// Shutdown logger provider first to flush pending logs
		if err := lp.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("logger provider shutdown: %w", err))
		}

		// Shutdown tracer provider
		if err := tp.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("tracer provider shutdown: %w", err))
		}

		// Shutdown meter provider
		if err := mp.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("meter provider shutdown: %w", err))
		}

		if len(errs) > 0 {
			return fmt.Errorf("telemetry shutdown errors: %v", errs)
		}

		return nil
	}

	return shutdown, nil
}

// initTracerProvider creates and configures the TracerProvider with OTLP/gRPC exporter
func initTracerProvider(ctx context.Context, res *resource.Resource) (*sdktrace.TracerProvider, error) {
	// Get OTLP endpoint from environment
	endpoint := getOTLPEndpoint()

	// Create OTLP/gRPC trace exporter
	traceExporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(), // Use TLS in production
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP trace exporter: %w", err)
	}

	// Get sampler configuration
	sampler := getSampler()

	// Create TracerProvider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sampler),
	)

	return tp, nil
}

// initMeterProvider creates and configures the MeterProvider with Prometheus exporter
func initMeterProvider(res *resource.Resource) (*metric.MeterProvider, error) {
	// Create Prometheus exporter that uses the global Prometheus registry
	// This allows metrics to be exposed on /metrics endpoint via promhttp.Handler()
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

// getOTLPEndpoint returns the OTLP collector endpoint from environment
// Default: localhost:4317 (development)
func getOTLPEndpoint() string {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:4317"
	}
	return endpoint
}

// getSampler configures trace sampling based on OTEL_TRACES_SAMPLER
// Supported values:
//   - "always_on": sample all traces (use for development only)
//   - "always_off": sample no traces
//   - "traceidratio": sample a fraction of traces (set OTEL_TRACES_SAMPLER_ARG=0.1 for 10%)
//   - "parentbased_traceidratio": respect parent sampling decision, else use traceidratio (default)
func getSampler() sdktrace.Sampler {
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

// parseSamplerArg parses the sampling ratio from OTEL_TRACES_SAMPLER_ARG
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

// initLoggerProvider creates and configures the LoggerProvider with OTLP/gRPC exporter
func initLoggerProvider(ctx context.Context, res *resource.Resource) (*sdklog.LoggerProvider, error) {
	// Get OTLP endpoint from environment (same as traces)
	endpoint := getOTLPEndpoint()

	// Create OTLP/gRPC log exporter
	logExporter, err := otlploggrpc.New(ctx,
		otlploggrpc.WithEndpoint(endpoint),
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

// getEnvOrDefault returns the value of an environment variable or a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
