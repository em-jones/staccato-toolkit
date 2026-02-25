package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestTraceHandler_WithActiveSpan(t *testing.T) {
	// Setup: create in-memory span recorder
	spanRecorder := tracetest.NewSpanRecorder()
	tp := trace.NewTracerProvider(trace.WithSpanProcessor(spanRecorder))
	otel.SetTracerProvider(tp)

	// Create a buffer to capture log output
	var buf bytes.Buffer
	baseHandler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	handler := NewTraceHandler(baseHandler)
	logger := slog.New(handler)

	// Create a span context
	tracer := tp.Tracer("test")
	ctx, span := tracer.Start(context.Background(), "test-span")
	defer span.End()

	// Log a message with trace context
	logger.InfoContext(ctx, "test message", slog.String("key", "value"))

	// Parse the log output
	var logEntry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
		t.Fatalf("Failed to parse log output: %v", err)
	}

	// Verify trace_id is present
	traceID, ok := logEntry["trace_id"].(string)
	if !ok {
		t.Error("trace_id field is missing or not a string")
	}
	if traceID == "" {
		t.Error("trace_id is empty")
	}

	// Verify span_id is present
	spanID, ok := logEntry["span_id"].(string)
	if !ok {
		t.Error("span_id field is missing or not a string")
	}
	if spanID == "" {
		t.Error("span_id is empty")
	}

	// Verify other fields
	if msg, ok := logEntry["msg"].(string); !ok || msg != "test message" {
		t.Errorf("msg = %v, want 'test message'", msg)
	}
	if key, ok := logEntry["key"].(string); !ok || key != "value" {
		t.Errorf("key = %v, want 'value'", key)
	}
}

func TestTraceHandler_WithoutActiveSpan(t *testing.T) {
	// Create a buffer to capture log output
	var buf bytes.Buffer
	baseHandler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	handler := NewTraceHandler(baseHandler)
	logger := slog.New(handler)

	// Log a message without trace context
	logger.Info("test message", slog.String("key", "value"))

	// Parse the log output
	var logEntry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
		t.Fatalf("Failed to parse log output: %v", err)
	}

	// Verify trace_id is NOT present (since no active span)
	if _, ok := logEntry["trace_id"]; ok {
		t.Error("trace_id should not be present without active span")
	}

	// Verify span_id is NOT present
	if _, ok := logEntry["span_id"]; ok {
		t.Error("span_id should not be present without active span")
	}

	// Verify other fields are still present
	if msg, ok := logEntry["msg"].(string); !ok || msg != "test message" {
		t.Errorf("msg = %v, want 'test message'", msg)
	}
	if key, ok := logEntry["key"].(string); !ok || key != "value" {
		t.Errorf("key = %v, want 'value'", key)
	}
}

func TestTraceHandler_Enabled(t *testing.T) {
	baseHandler := slog.NewJSONHandler(nil, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	handler := NewTraceHandler(baseHandler)

	ctx := context.Background()

	// Info level should be enabled
	if !handler.Enabled(ctx, slog.LevelInfo) {
		t.Error("Info level should be enabled")
	}

	// Debug level should be disabled (base handler is Info level)
	if handler.Enabled(ctx, slog.LevelDebug) {
		t.Error("Debug level should be disabled")
	}

	// Error level should be enabled
	if !handler.Enabled(ctx, slog.LevelError) {
		t.Error("Error level should be enabled")
	}
}

func TestTraceHandler_WithAttrs(t *testing.T) {
	var buf bytes.Buffer
	baseHandler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	handler := NewTraceHandler(baseHandler)

	// Add attributes
	handlerWithAttrs := handler.WithAttrs([]slog.Attr{
		slog.String("service", "test-service"),
	})

	logger := slog.New(handlerWithAttrs)
	logger.Info("test message")

	// Parse the log output
	var logEntry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
		t.Fatalf("Failed to parse log output: %v", err)
	}

	// Verify the attribute is present
	if service, ok := logEntry["service"].(string); !ok || service != "test-service" {
		t.Errorf("service = %v, want 'test-service'", service)
	}
}

func TestTraceHandler_WithGroup(t *testing.T) {
	var buf bytes.Buffer
	baseHandler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	handler := NewTraceHandler(baseHandler)

	// Create a group
	handlerWithGroup := handler.WithGroup("context")
	logger := slog.New(handlerWithGroup)
	logger.Info("test message", slog.String("user_id", "123"))

	// Parse the log output
	var logEntry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
		t.Fatalf("Failed to parse log output: %v", err)
	}

	// Verify the group is present
	contextGroup, ok := logEntry["context"].(map[string]interface{})
	if !ok {
		t.Fatal("context group is missing or not a map")
	}

	if userID, ok := contextGroup["user_id"].(string); !ok || userID != "123" {
		t.Errorf("context.user_id = %v, want '123'", userID)
	}
}
