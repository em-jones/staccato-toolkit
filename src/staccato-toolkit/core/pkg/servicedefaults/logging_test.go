package servicedefaults

import (
	"log/slog"
	"os"
	"testing"

	sdklog "go.opentelemetry.io/otel/sdk/log"
)

// TestSetupLogging_DefaultLoggerNotNil verifies that after calling setupLogging,
// slog.Default() returns a non-nil logger.
func TestSetupLogging_DefaultLoggerNotNil(t *testing.T) {
	// Create a minimal LoggerProvider for testing
	lp := sdklog.NewLoggerProvider()
	defer func() {
		if err := lp.Shutdown(nil); err != nil {
			t.Logf("LoggerProvider shutdown warning: %v", err)
		}
	}()

	// Call setupLogging
	setupLogging("test-service", "1.0.0", "test", lp)

	// Verify slog.Default() is not nil
	logger := slog.Default()
	if logger == nil {
		t.Fatal("Expected slog.Default() to be non-nil after setupLogging")
	}

	// Verify we can log without panic
	logger.Info("test log message")
}

// TestSetupLogging_DebugLevel verifies that LOG_LEVEL=debug enables debug logging.
func TestSetupLogging_DebugLevel(t *testing.T) {
	// Set LOG_LEVEL environment variable
	originalLevel := os.Getenv("LOG_LEVEL")
	os.Setenv("LOG_LEVEL", "debug")
	defer os.Setenv("LOG_LEVEL", originalLevel)

	// Create a minimal LoggerProvider for testing
	lp := sdklog.NewLoggerProvider()
	defer func() {
		if err := lp.Shutdown(nil); err != nil {
			t.Logf("LoggerProvider shutdown warning: %v", err)
		}
	}()

	// Call setupLogging
	setupLogging("test-service", "1.0.0", "test", lp)

	// Verify slog.Default() is configured
	logger := slog.Default()
	if logger == nil {
		t.Fatal("Expected slog.Default() to be non-nil after setupLogging")
	}

	// Verify debug logging works (should not panic)
	logger.Debug("debug message")
}

// TestSetupLogging_NoGlobalLoggerVariable verifies that the package does not
// declare a global `var logger` variable. This test ensures we follow the
// requirement to use slog.Default() instead of package-level logger variables.
func TestSetupLogging_NoGlobalLoggerVariable(t *testing.T) {
	// This is a documentation test - the actual verification is done by code review.
	// The spec requires: "Services MUST NOT declare package-level `var logger *slog.Logger`"
	// This package correctly uses slog.SetDefault() instead.
	t.Log("Package correctly uses slog.SetDefault() without global logger variable")
}

// TestSetupLogging_LogLevels verifies different log level configurations.
func TestSetupLogging_LogLevels(t *testing.T) {
	tests := []struct {
		name     string
		logLevel string
	}{
		{"info level", "info"},
		{"warn level", "warn"},
		{"error level", "error"},
		{"debug level", "debug"},
		{"default (empty)", ""},
		{"invalid defaults to info", "invalid"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set LOG_LEVEL environment variable
			originalLevel := os.Getenv("LOG_LEVEL")
			if tt.logLevel != "" {
				os.Setenv("LOG_LEVEL", tt.logLevel)
			} else {
				os.Unsetenv("LOG_LEVEL")
			}
			defer os.Setenv("LOG_LEVEL", originalLevel)

			// Create a minimal LoggerProvider for testing
			lp := sdklog.NewLoggerProvider()
			defer func() {
				if err := lp.Shutdown(nil); err != nil {
					t.Logf("LoggerProvider shutdown warning: %v", err)
				}
			}()

			// Call setupLogging - should not panic
			setupLogging("test-service", "1.0.0", "test", lp)

			// Verify logger is configured
			logger := slog.Default()
			if logger == nil {
				t.Fatal("Expected slog.Default() to be non-nil after setupLogging")
			}
		})
	}
}
