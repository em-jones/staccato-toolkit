package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/staccato-toolkit/core/pkg/servicedefaults"
)

func main() {
	ctx := context.Background()

	// Initialize service defaults: telemetry (tracing, metrics, logging), structured logging
	shutdown, err := servicedefaults.Configure(ctx, "${SERVICE_NAME}")
	if err != nil {
		slog.Error("failed to configure service defaults", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			slog.Error("failed to shutdown service defaults", "error", err)
		}
	}()

	// Your service logic here
	slog.Info("${SERVICE_NAME} started successfully")
}
