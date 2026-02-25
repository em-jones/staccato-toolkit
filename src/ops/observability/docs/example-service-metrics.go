// Example Go service demonstrating OpenTelemetry metrics integration
//
// This is a complete example showing:
// - OTel SDK initialization with OTLP exporter
// - Custom business metrics (counter, histogram)
// - HTTP instrumentation
// - Metric naming convention compliance
//
// Usage:
//   export SERVICE_NAME=example-api
//   export ENVIRONMENT=development
//   export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
//   go run example-service-metrics.go

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

var (
	meter = otel.Meter("example-api")

	// Custom business metrics following naming convention: <service>_<subsystem>_<unit>_total

	// Counter: total orders created
	orderCreatedTotal metric.Int64Counter

	// Counter: total HTTP requests (custom, in addition to otelhttp middleware)
	httpRequestsTotal metric.Int64Counter

	// Histogram: order processing duration
	orderProcessingDurationMs metric.Float64Histogram

	// Histogram: HTTP request duration
	httpRequestDurationMs metric.Float64Histogram

	// UpDownCounter (gauge): active order processing jobs
	activeOrderJobs metric.Int64UpDownCounter
)

func main() {
	ctx := context.Background()

	// Initialize OpenTelemetry metrics
	shutdown, err := initMetrics(ctx)
	if err != nil {
		log.Fatalf("failed to initialize metrics: %v", err)
	}
	defer shutdown(ctx)

	// Initialize custom metrics
	if err := initCustomMetrics(); err != nil {
		log.Fatalf("failed to initialize custom metrics: %v", err)
	}

	// Setup HTTP server with OTel instrumentation
	mux := http.NewServeMux()

	// Health endpoints
	mux.HandleFunc("/health/live", healthLiveHandler)
	mux.HandleFunc("/health/ready", healthReadyHandler)

	// Business endpoints
	mux.HandleFunc("/orders", createOrderHandler)
	mux.HandleFunc("/orders/", getOrderHandler)

	// Wrap handler with OTel middleware for automatic HTTP metrics
	handler := otelhttp.NewHandler(mux, "example-api")

	server := &http.Server{
		Addr:    ":8080",
		Handler: handler,
	}

	// Start server
	go func() {
		log.Println("starting server on :8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}

	if err := shutdown(ctx); err != nil {
		log.Printf("metrics shutdown error: %v", err)
	}
}

// initMetrics initializes the OpenTelemetry metrics SDK with OTLP exporter
func initMetrics(ctx context.Context) (func(context.Context) error, error) {
	serviceName := getEnv("SERVICE_NAME", "example-api")
	environment := getEnv("ENVIRONMENT", "development")
	otlpEndpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")

	// Create resource with service metadata
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(serviceName),
			semconv.DeploymentEnvironment(environment),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create OTLP exporter
	exporter, err := otlpmetricgrpc.New(ctx,
		otlpmetricgrpc.WithEndpoint(otlpEndpoint),
		otlpmetricgrpc.WithInsecure(), // Use TLS in production
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
	}

	// Create meter provider with periodic reader
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(
			sdkmetric.NewPeriodicReader(exporter,
				sdkmetric.WithInterval(15*time.Second), // Match Prometheus scrape interval
			),
		),
	)

	// Set global meter provider
	otel.SetMeterProvider(meterProvider)

	log.Printf("metrics initialized: service=%s, environment=%s, endpoint=%s", serviceName, environment, otlpEndpoint)

	return meterProvider.Shutdown, nil
}

// initCustomMetrics initializes custom business metrics
func initCustomMetrics() error {
	var err error

	// Counter: total orders created
	orderCreatedTotal, err = meter.Int64Counter(
		"example_order_created_total",
		metric.WithDescription("Total number of orders created"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return fmt.Errorf("failed to create orderCreatedTotal: %w", err)
	}

	// Counter: total HTTP requests
	httpRequestsTotal, err = meter.Int64Counter(
		"example_http_requests_total",
		metric.WithDescription("Total number of HTTP requests"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return fmt.Errorf("failed to create httpRequestsTotal: %w", err)
	}

	// Histogram: order processing duration
	orderProcessingDurationMs, err = meter.Float64Histogram(
		"example_order_processing_duration_ms",
		metric.WithDescription("Order processing duration in milliseconds"),
		metric.WithUnit("ms"),
		metric.WithExplicitBucketBoundaries(10, 50, 100, 250, 500, 1000, 2500, 5000),
	)
	if err != nil {
		return fmt.Errorf("failed to create orderProcessingDurationMs: %w", err)
	}

	// Histogram: HTTP request duration
	httpRequestDurationMs, err = meter.Float64Histogram(
		"example_http_request_duration_ms",
		metric.WithDescription("HTTP request duration in milliseconds"),
		metric.WithUnit("ms"),
		metric.WithExplicitBucketBoundaries(5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000),
	)
	if err != nil {
		return fmt.Errorf("failed to create httpRequestDurationMs: %w", err)
	}

	// UpDownCounter: active order processing jobs
	activeOrderJobs, err = meter.Int64UpDownCounter(
		"example_order_active_jobs",
		metric.WithDescription("Number of active order processing jobs"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return fmt.Errorf("failed to create activeOrderJobs: %w", err)
	}

	log.Println("custom metrics initialized")
	return nil
}

// createOrderHandler handles POST /orders
func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	ctx := r.Context()

	// Simulate order creation
	orderID := fmt.Sprintf("order-%d", time.Now().Unix())
	paymentMethod := r.URL.Query().Get("payment_method")
	if paymentMethod == "" {
		paymentMethod = "credit_card"
	}

	// Increment active jobs gauge
	activeOrderJobs.Add(ctx, 1)
	defer activeOrderJobs.Add(ctx, -1)

	// Simulate processing time
	time.Sleep(100 * time.Millisecond)

	// Record business metric: order created
	orderCreatedTotal.Add(ctx, 1,
		metric.WithAttributes(
			attribute.String("payment_method", paymentMethod),
		),
	)

	// Record processing duration
	durationMs := float64(time.Since(start).Milliseconds())
	orderProcessingDurationMs.Record(ctx, durationMs,
		metric.WithAttributes(
			attribute.String("payment_method", paymentMethod),
			attribute.String("status", "success"),
		),
	)

	// Record HTTP request
	recordHTTPRequest(ctx, r.Method, "/orders", http.StatusCreated, durationMs)

	// Return response
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, `{"order_id": "%s", "status": "created"}`, orderID)
}

// getOrderHandler handles GET /orders/{id}
func getOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()
	ctx := r.Context()

	// Simulate order retrieval
	orderID := r.URL.Path[len("/orders/"):]
	if orderID == "" {
		http.Error(w, "order ID required", http.StatusBadRequest)
		recordHTTPRequest(ctx, r.Method, "/orders/{id}", http.StatusBadRequest, float64(time.Since(start).Milliseconds()))
		return
	}

	// Simulate database query
	time.Sleep(10 * time.Millisecond)

	// Record HTTP request
	durationMs := float64(time.Since(start).Milliseconds())
	recordHTTPRequest(ctx, r.Method, "/orders/{id}", http.StatusOK, durationMs)

	// Return response
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"order_id": "%s", "status": "completed"}`, orderID)
}

// healthLiveHandler handles GET /health/live
func healthLiveHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "OK")
}

// healthReadyHandler handles GET /health/ready
func healthReadyHandler(w http.ResponseWriter, r *http.Request) {
	// Check dependencies (database, cache, etc.)
	// For this example, always return OK
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "OK")
}

// recordHTTPRequest records HTTP request metrics
func recordHTTPRequest(ctx context.Context, method, route string, statusCode int, durationMs float64) {
	// Record request count
	httpRequestsTotal.Add(ctx, 1,
		metric.WithAttributes(
			attribute.String("method", method),
			attribute.String("route", route),
			attribute.String("status_code", strconv.Itoa(statusCode)),
		),
	)

	// Record request duration
	httpRequestDurationMs.Record(ctx, durationMs,
		metric.WithAttributes(
			attribute.String("method", method),
			attribute.String("route", route),
		),
	)
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
