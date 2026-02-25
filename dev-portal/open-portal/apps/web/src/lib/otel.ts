/**
 * OpenTelemetry SDK initialization for OpenPort self-introspection.
 *
 * Import this module ONCE at server startup (before any routes are registered).
 * It is safe to import in environments that do not have an OTLP endpoint configured —
 * the SDK will emit a warning but will not crash.
 *
 * Controlled by OPENPORT_SELF_INTROSPECTION env var (default: true).
 */

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import { boolFromEnv, env } from "../env";

const ENDPOINT = env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
const SERVICE_NAME = env.OTEL_SERVICE_NAME ?? "openport";

let sdk: NodeSDK | null = null;

/**
 * Initialise the OTel SDK. Idempotent — calling multiple times is a no-op.
 */
export function initOtel(): void {
  if (sdk !== null) return;
  if (!boolFromEnv.OPENPORT_SELF_INTROSPECTION) return;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: "0.1.0",
    }),

    traceExporter: new OTLPTraceExporter({
      url: `${ENDPOINT}/v1/traces`,
    }),

    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 30_000,
    }),

    logRecordProcessors: [
      new SimpleLogRecordProcessor(new OTLPLogExporter({ url: `${ENDPOINT}/v1/logs` })),
    ],

    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": { enabled: true },
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk!.shutdown().catch(console.error);
  });
}

/**
 * Returns the current active tracer for manual span creation.
 */
export function getTracer() {
  const { trace } = require("@opentelemetry/api") as typeof import("@opentelemetry/api");
  return trace.getTracer(SERVICE_NAME);
}
