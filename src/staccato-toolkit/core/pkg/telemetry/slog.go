package telemetry

import (
	"context"
	"log/slog"

	"go.opentelemetry.io/otel/trace"
)

// TraceHandler is a custom slog.Handler that injects trace_id and span_id
// from the active OpenTelemetry span context into every log record.
// If no active span exists, these fields are omitted.
type TraceHandler struct {
	handler slog.Handler
}

// NewTraceHandler wraps any slog.Handler to add trace context injection.
// The returned handler will automatically include trace_id and span_id fields
// when a log record is emitted within an active span context.
func NewTraceHandler(h slog.Handler) slog.Handler {
	return &TraceHandler{handler: h}
}

// Enabled reports whether the handler handles records at the given level.
func (h *TraceHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.handler.Enabled(ctx, level)
}

// Handle processes a log record, injecting trace context if available.
func (h *TraceHandler) Handle(ctx context.Context, r slog.Record) error {
	// Extract span from context
	span := trace.SpanFromContext(ctx)
	spanCtx := span.SpanContext()

	// Only inject trace fields if span context is valid
	if spanCtx.IsValid() {
		// Add trace_id and span_id to the record
		r.AddAttrs(
			slog.String("trace_id", spanCtx.TraceID().String()),
			slog.String("span_id", spanCtx.SpanID().String()),
		)
	}

	// Delegate to wrapped handler
	return h.handler.Handle(ctx, r)
}

// WithAttrs returns a new handler with the given attributes added.
func (h *TraceHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &TraceHandler{handler: h.handler.WithAttrs(attrs)}
}

// WithGroup returns a new handler with the given group name.
func (h *TraceHandler) WithGroup(name string) slog.Handler {
	return &TraceHandler{handler: h.handler.WithGroup(name)}
}
