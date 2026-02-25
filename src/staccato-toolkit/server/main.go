package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/staccato-toolkit/core/pkg/telemetry"
	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
	// Initialize telemetry (OTel tracing, metrics, and logging)
	ctx := context.Background()
	shutdown, err := telemetry.InitTelemetry(ctx, "staccato-server")
	if err != nil {
		slog.Error("failed to initialize telemetry", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			slog.Error("failed to shutdown telemetry", "error", err)
		}
	}()

	// Set up structured logging with OTel bridge.
	// Layer: slog.Default() -> TraceHandler -> JSONHandler -> stdout
	// Also: otelslog bridge forwards to OTel LoggerProvider -> OTLP -> Collector -> Loki
	baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	})
	traceHandler := telemetry.NewTraceHandler(baseHandler)
	slog.SetDefault(slog.New(traceHandler))

	// otelslog bridge hooks into the global OTel LoggerProvider set by InitTelemetry.
	// Assigning to _ suppresses unused-variable warning; the bridge is activated via
	// global.SetLoggerProvider inside InitTelemetry.
	_ = otelslog.NewHandler("staccato-server")

	// Create chi router
	r := chi.NewRouter()

	// Middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	// OTel HTTP middleware: creates a span per request, records http.method, http.route, etc.
	r.Use(func(next http.Handler) http.Handler {
		return otelhttp.NewHandler(next, "staccato-server")
	})

	// GET /healthz — liveness probe; must not depend on external services
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"status":"ok"}`)
	})

	// GET /metrics — Prometheus text exposition format
	r.Handle("/metrics", promhttp.Handler())

	// GET /api/v1/status — stub API endpoint for end-to-end tracing validation
	r.Get("/api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		resp := map[string]string{
			"service": "staccato-server",
			"version": getEnvOrDefault("SERVICE_VERSION", "dev"),
		}
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			slog.ErrorContext(r.Context(), "failed to encode status response", "error", err)
		}
	})

	// Get port from environment or use default
	port := getEnvOrDefault("PORT", "8080")
	addr := fmt.Sprintf(":%s", port)

	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("starting staccato-server", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
		os.Exit(1)
	}

	slog.Info("server exited")
}

// getEnvOrDefault returns the value of an environment variable or a default value.
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
