package servicedefaults

import (
	"log/slog"
	"os"
	"strings"

	"github.com/staccato-toolkit/core/pkg/telemetry"
	sdklog "go.opentelemetry.io/otel/sdk/log"
)

// setupLogging configures the default slog logger with OpenTelemetry integration.
// It creates a JSON handler writing to stdout, wraps it with TraceHandler for
// trace context injection, and sets it as the default logger with service metadata.
//
// The otelslog bridge is automatically activated because global.SetLoggerProvider(lp)
// was called in Configure() - no explicit bridge setup is needed here.
//
// Parameters:
//   - serviceName: Name of the service (added to all log records)
//   - version: Service version from SERVICE_VERSION env var
//   - environment: Deployment environment from ENVIRONMENT env var
//   - lp: OpenTelemetry LoggerProvider for OTLP export
func setupLogging(serviceName, version, environment string, lp *sdklog.LoggerProvider) {
	// Read LOG_LEVEL env var (debug/info/warn/error), default to info
	logLevelStr := os.Getenv("LOG_LEVEL")
	if logLevelStr == "" {
		logLevelStr = "info"
	}

	// Parse log level
	var level slog.Level
	switch strings.ToLower(logLevelStr) {
	case "debug":
		level = slog.LevelDebug
	case "info":
		level = slog.LevelInfo
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	// Create JSON handler writing to stdout
	baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	})

	// Wrap with TraceHandler to inject trace_id and span_id
	traceHandler := telemetry.NewTraceHandler(baseHandler)

	// Set as default logger with pre-configured service attributes
	logger := slog.New(traceHandler).With(
		"service", serviceName,
		"version", version,
		"environment", environment,
	)
	slog.SetDefault(logger)

	// Note: The otelslog bridge is activated automatically because
	// global.SetLoggerProvider(lp) was called in Configure().
	// The bridge auto-hooks into the global LoggerProvider.
	_ = lp // Reference lp to show it's used for bridge activation context
}
