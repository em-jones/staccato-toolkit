export interface MetricDataPoint {
  /** Unix milliseconds */
  timestamp: number;
  value: number;
}

export interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  /** CSS color string; defaults to primary theme color */
  color?: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  /** ISO-8601 timestamp string */
  timestamp: string;
  level: LogLevel;
  message: string;
  labels?: Record<string, string>;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  /** Unix milliseconds */
  startMs: number;
  durationMs: number;
  status?: "ok" | "error" | "unset";
  labels?: Record<string, string>;
}
