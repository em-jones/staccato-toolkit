/**
 * Structured application logger.
 *
 * Emits OTel Log Records when the SDK is initialised.
 * Each record includes `severity`, `body`, and `trace_id` when an active
 * span is present in the current context.
 */

import { context, trace } from "@opentelemetry/api";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";

const LOGGER_NAME = "openport";

type LogLevel = "debug" | "info" | "warn" | "error";

const SEVERITY: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

function emit(level: LogLevel, body: string, attrs?: Record<string, string>) {
  const logger = logs.getLogger(LOGGER_NAME);
  const activeSpan = trace.getSpan(context.active());
  const spanCtx = activeSpan?.spanContext();

  logger.emit({
    severityNumber: SEVERITY[level],
    severityText: level.toUpperCase(),
    body,
    attributes: {
      ...(spanCtx ? { trace_id: spanCtx.traceId, span_id: spanCtx.spanId } : {}),
      ...attrs,
    },
  });

  // Mirror to console so logs appear during local dev without a collector.
  const consoleFn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  consoleFn(`[${level.toUpperCase()}] ${body}`, attrs ?? "");
}

export const logger = {
  debug: (msg: string, attrs?: Record<string, string>) => emit("debug", msg, attrs),
  info: (msg: string, attrs?: Record<string, string>) => emit("info", msg, attrs),
  warn: (msg: string, attrs?: Record<string, string>) => emit("warn", msg, attrs),
  error: (msg: string, attrs?: Record<string, string>) => emit("error", msg, attrs),
};
