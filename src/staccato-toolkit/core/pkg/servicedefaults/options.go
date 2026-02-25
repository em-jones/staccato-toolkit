package servicedefaults

import (
	"log/slog"
	"time"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// Option configures the service defaults initialization.
type Option func(*config)

// config holds the configuration for service defaults.
type config struct {
	otlpEndpoint string
	sampler      sdktrace.Sampler
	logLevel     slog.Level
	dialTimeout  time.Duration
}

// defaultConfig returns the default configuration.
func defaultConfig() *config {
	return &config{
		otlpEndpoint: "localhost:4317",
		sampler:      sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1)), // 10% sampling by default
		logLevel:     slog.LevelInfo,
		dialTimeout:  5 * time.Second,
	}
}

// WithOTLPEndpoint sets the OTLP endpoint for traces and logs.
func WithOTLPEndpoint(endpoint string) Option {
	return func(c *config) {
		c.otlpEndpoint = endpoint
	}
}

// WithSampler sets the trace sampler.
func WithSampler(sampler sdktrace.Sampler) Option {
	return func(c *config) {
		c.sampler = sampler
	}
}

// WithLogLevel sets the minimum log level.
func WithLogLevel(level slog.Level) Option {
	return func(c *config) {
		c.logLevel = level
	}
}

// WithDialTimeout sets the timeout for OTLP dial operations.
func WithDialTimeout(timeout time.Duration) Option {
	return func(c *config) {
		c.dialTimeout = timeout
	}
}
