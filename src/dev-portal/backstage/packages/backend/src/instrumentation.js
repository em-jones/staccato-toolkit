// Prevent from running more than once (due to worker threads)
const { isMainThread } = require('node:worker_threads');

if (isMainThread) {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const {
    getNodeAutoInstrumentations,
  } = require('@opentelemetry/auto-instrumentations-node');
  const {
    OTLPTraceExporter,
  } = require('@opentelemetry/exporter-trace-otlp-http');
  const {
    OTLPMetricExporter,
  } = require('@opentelemetry/exporter-metrics-otlp-http');
  const {
    OTLPLogExporter,
  } = require('@opentelemetry/exporter-logs-otlp-http');
  const {
    PeriodicExportingMetricReader,
    ExplicitBucketHistogramAggregation,
    View,
  } = require('@opentelemetry/sdk-node');
  const {
    SimpleLogRecordProcessor,
    LoggerProvider,
  } = require('@opentelemetry/sdk-logs');
  const { logs } = require('@opentelemetry/api-logs');

  // OTLP endpoint: defaults to Grafana Alloy in cluster.
  // Override with OTEL_EXPORTER_OTLP_ENDPOINT for local dev or alternative collectors.
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://alloy.monitoring.svc.cluster.local:4318';

  // Traces → Alloy OTLP/HTTP receiver → Tempo
  const otlpTraceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  // Metrics → Alloy OTLP/HTTP receiver → Prometheus remote_write
  const otlpMetricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  });

  // Logs → Alloy OTLP/HTTP receiver → Loki
  const otlpLogExporter = new OTLPLogExporter({
    url: `${otlpEndpoint}/v1/logs`,
  });

  // Set up log provider so OTel log records are exported via OTLP
  const loggerProvider = new LoggerProvider();
  loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(otlpLogExporter),
  );
  logs.setGlobalLoggerProvider(loggerProvider);

  const sdk = new NodeSDK({
    traceExporter: otlpTraceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: otlpMetricExporter,
      // Export metrics every 60 seconds
      exportIntervalMillis: 60_000,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    // Override histogram buckets for catalog metrics that emit in seconds.
    // The SDK default is millisecond-scale; catalog processing metrics use seconds.
    views: [
      new View({
        instrumentName: 'catalog.processing.duration',
        aggregation: new ExplicitBucketHistogramAggregation([
          0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 1000,
        ]),
      }),
      new View({
        instrumentName: 'catalog.processors.duration',
        aggregation: new ExplicitBucketHistogramAggregation([
          0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 1000,
        ]),
      }),
      new View({
        instrumentName: 'catalog.stitching.duration',
        aggregation: new ExplicitBucketHistogramAggregation([
          0, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 1000,
        ]),
      }),
    ],
  });

  sdk.start();
}
