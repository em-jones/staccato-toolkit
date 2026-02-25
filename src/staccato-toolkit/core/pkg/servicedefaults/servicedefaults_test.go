package servicedefaults

import (
	"context"
	"os"
	"testing"
	"time"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func TestConfigure_OTelSDKDisabled(t *testing.T) {
	// Set OTEL_SDK_DISABLED=true
	os.Setenv("OTEL_SDK_DISABLED", "true")
	defer os.Unsetenv("OTEL_SDK_DISABLED")

	ctx := context.Background()
	shutdown, err := Configure(ctx, "test-service")
	if err != nil {
		t.Fatalf("Configure() failed: %v", err)
	}

	// Shutdown should be no-op
	if err := shutdown(ctx); err != nil {
		t.Errorf("shutdown() failed: %v", err)
	}

	// TracerProvider should still be the default (no-op)
	tp := otel.GetTracerProvider()
	if tp == nil {
		t.Error("TracerProvider should not be nil")
	}
}

func TestConfigure_Success(t *testing.T) {
	// Ensure OTEL_SDK_DISABLED is not set
	os.Unsetenv("OTEL_SDK_DISABLED")

	// Use a non-existent endpoint to test non-blocking dial
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:9999")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	shutdown, err := Configure(ctx, "test-service")
	if err != nil {
		t.Fatalf("Configure() failed: %v", err)
	}
	defer shutdown(ctx)

	// TracerProvider should be initialized
	tp := otel.GetTracerProvider()
	if tp == nil {
		t.Error("TracerProvider should not be nil")
	}

	// MeterProvider should be initialized
	mp := otel.GetMeterProvider()
	if mp == nil {
		t.Error("MeterProvider should not be nil")
	}

	// Test that Configure returns quickly (non-blocking dial)
	start := time.Now()
	shutdown2, err := Configure(ctx, "test-service-2")
	elapsed := time.Since(start)
	if err != nil {
		t.Fatalf("Second Configure() failed: %v", err)
	}
	defer shutdown2(ctx)

	// Should complete in less than 1 second (non-blocking)
	if elapsed > 1*time.Second {
		t.Errorf("Configure() took too long: %v (expected < 1s)", elapsed)
	}
}

func TestConfigure_WithOptions(t *testing.T) {
	os.Unsetenv("OTEL_SDK_DISABLED")
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:9999")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	ctx := context.Background()
	shutdown, err := Configure(ctx, "test-service",
		WithOTLPEndpoint("custom:4317"),
		WithSampler(sdktrace.AlwaysSample()),
	)
	if err != nil {
		t.Fatalf("Configure() with options failed: %v", err)
	}
	defer shutdown(ctx)

	// Should succeed without errors
	if shutdown == nil {
		t.Error("shutdown function should not be nil")
	}
}

func TestConfigure_EnvVarOverrides(t *testing.T) {
	os.Unsetenv("OTEL_SDK_DISABLED")

	// Test OTLP endpoint override
	os.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "env-endpoint:4317")
	defer os.Unsetenv("OTEL_EXPORTER_OTLP_ENDPOINT")

	// Test sampler override
	os.Setenv("OTEL_TRACES_SAMPLER", "always_on")
	defer os.Unsetenv("OTEL_TRACES_SAMPLER")

	ctx := context.Background()
	shutdown, err := Configure(ctx, "test-service")
	if err != nil {
		t.Fatalf("Configure() with env overrides failed: %v", err)
	}
	defer shutdown(ctx)

	// Should succeed without errors
	if shutdown == nil {
		t.Error("shutdown function should not be nil")
	}
}

func TestGetSamplerFromEnv(t *testing.T) {
	tests := []struct {
		name        string
		samplerType string
		samplerArg  string
		wantType    string
	}{
		{
			name:        "always_on",
			samplerType: "always_on",
			wantType:    "AlwaysSample",
		},
		{
			name:        "always_off",
			samplerType: "always_off",
			wantType:    "NeverSample",
		},
		{
			name:        "traceidratio",
			samplerType: "traceidratio",
			samplerArg:  "0.5",
			wantType:    "TraceIDRatioBased",
		},
		{
			name:        "parentbased_traceidratio",
			samplerType: "parentbased_traceidratio",
			samplerArg:  "0.1",
			wantType:    "ParentBased",
		},
		{
			name:        "default",
			samplerType: "",
			wantType:    "ParentBased",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("OTEL_TRACES_SAMPLER", tt.samplerType)
			os.Setenv("OTEL_TRACES_SAMPLER_ARG", tt.samplerArg)
			defer os.Unsetenv("OTEL_TRACES_SAMPLER")
			defer os.Unsetenv("OTEL_TRACES_SAMPLER_ARG")

			sampler := getSamplerFromEnv()
			if sampler == nil {
				t.Error("sampler should not be nil")
			}
		})
	}
}

func TestParseSamplerArg(t *testing.T) {
	tests := []struct {
		name         string
		arg          string
		defaultRatio float64
		want         float64
	}{
		{
			name:         "valid ratio",
			arg:          "0.5",
			defaultRatio: 0.1,
			want:         0.5,
		},
		{
			name:         "empty arg",
			arg:          "",
			defaultRatio: 0.1,
			want:         0.1,
		},
		{
			name:         "invalid arg",
			arg:          "invalid",
			defaultRatio: 0.1,
			want:         0.1,
		},
		{
			name:         "out of range negative",
			arg:          "-0.5",
			defaultRatio: 0.1,
			want:         0.1,
		},
		{
			name:         "out of range positive",
			arg:          "1.5",
			defaultRatio: 0.1,
			want:         0.1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseSamplerArg(tt.arg, tt.defaultRatio)
			if got != tt.want {
				t.Errorf("parseSamplerArg() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetEnvOrDefault(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		want         string
	}{
		{
			name:         "env var set",
			key:          "TEST_KEY",
			defaultValue: "default",
			envValue:     "custom",
			want:         "custom",
		},
		{
			name:         "env var not set",
			key:          "TEST_KEY",
			defaultValue: "default",
			envValue:     "",
			want:         "default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			} else {
				os.Unsetenv(tt.key)
			}

			got := getEnvOrDefault(tt.key, tt.defaultValue)
			if got != tt.want {
				t.Errorf("getEnvOrDefault() = %v, want %v", got, tt.want)
			}
		})
	}
}
