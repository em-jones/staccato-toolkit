package telemetry

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel"
)

func TestInitTelemetry(t *testing.T) {
	ctx := context.Background()

	// Initialize telemetry
	shutdown, err := InitTelemetry(ctx, "test-service")
	if err != nil {
		t.Fatalf("InitTelemetry failed: %v", err)
	}
	defer shutdown(ctx)

	// Verify TracerProvider is set
	tp := otel.GetTracerProvider()
	if tp == nil {
		t.Fatal("TracerProvider is nil")
	}

	// Verify we can get a tracer
	tracer := tp.Tracer("test")
	if tracer == nil {
		t.Fatal("Tracer is nil")
	}

	// Verify MeterProvider is set
	mp := otel.GetMeterProvider()
	if mp == nil {
		t.Fatal("MeterProvider is nil")
	}

	// Verify we can get a meter
	meter := mp.Meter("test")
	if meter == nil {
		t.Fatal("Meter is nil")
	}
}

func TestInitTelemetry_Shutdown(t *testing.T) {
	ctx := context.Background()

	shutdown, err := InitTelemetry(ctx, "test-service")
	if err != nil {
		t.Fatalf("InitTelemetry failed: %v", err)
	}

	// Shutdown should not error
	if err := shutdown(ctx); err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}
}

func TestGetOTLPEndpoint(t *testing.T) {
	tests := []struct {
		name     string
		envValue string
		want     string
	}{
		{
			name:     "default endpoint",
			envValue: "",
			want:     "localhost:4317",
		},
		{
			name:     "custom endpoint",
			envValue: "otel-collector:4317",
			want:     "otel-collector:4317",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable
			if tt.envValue != "" {
				t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", tt.envValue)
			}

			got := getOTLPEndpoint()
			if got != tt.want {
				t.Errorf("getOTLPEndpoint() = %v, want %v", got, tt.want)
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
			name:         "empty arg uses default",
			arg:          "",
			defaultRatio: 0.1,
			want:         0.1,
		},
		{
			name:         "valid ratio",
			arg:          "0.5",
			defaultRatio: 0.1,
			want:         0.5,
		},
		{
			name:         "ratio below 0 uses default",
			arg:          "-0.1",
			defaultRatio: 0.1,
			want:         0.1,
		},
		{
			name:         "ratio above 1 uses default",
			arg:          "1.5",
			defaultRatio: 0.1,
			want:         0.1,
		},
		{
			name:         "invalid format uses default",
			arg:          "invalid",
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
