import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type {
  MetricQuery,
  MetricQueryResult,
  TimeSeries,
  TimeSeriesDataPoint,
  Label,
  SignalProviderConnection,
} from "@op/platform/signals-api";
import type { MetricsSignalProviderClient } from "@op/platform/signal-provider-core-metrics";

// ─── ClickHouse response shapes ───────────────────────────────────────────────

interface ClickhouseResponse<T> {
  data: T[];
  rows: number;
}

interface ClickhouseMetricRow {
  TimeUnix: string;
  Value: number;
  Attributes: Record<string, string>;
  MetricName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const recordToLabels = (r: Record<string, string>): Label[] =>
  Object.entries(r).map(([key, value]) => ({ key, value }));

/**
 * Groups flat metric rows into labeled TimeSeries by unique attribute fingerprint.
 */
const rowsToTimeSeries = (rows: ClickhouseMetricRow[]): TimeSeries[] => {
  const seriesMap = new Map<string, { labels: Label[]; dataPoints: TimeSeriesDataPoint[] }>();

  rows.forEach((row) => {
    const key = JSON.stringify(row.Attributes);
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        labels: [{ key: "__name__", value: row.MetricName }, ...recordToLabels(row.Attributes)],
        dataPoints: [],
      });
    }
    seriesMap.get(key)!.dataPoints.push({
      timestamp: row.TimeUnix,
      value: row.Value,
    });
  });

  return Array.from(seriesMap.values());
};

/**
 * Builds a ClickHouse SQL query for metric time series data.
 * Queries the otel_metrics_gauge table; expression is used as an optional
 * MetricName filter (PromQL-style expression parsing is out of scope here —
 * the expression is treated as a metric name pattern).
 */
const buildMetricQuery = (query: MetricQuery): string => {
  const step = query.stepSeconds ?? 60;
  const filters: string[] = [
    `TimeUnix >= '${query.timeRange.start}'`,
    `TimeUnix <= '${query.timeRange.end}'`,
  ];

  if (query.expression) {
    filters.push(`MetricName = '${query.expression.replace(/'/g, "''")}'`);
  }

  return [
    "SELECT",
    `  toStartOfInterval(TimeUnix, INTERVAL ${step} SECOND) AS TimeUnix,`,
    "  avg(Value) AS Value,",
    "  Attributes,",
    "  MetricName",
    "FROM otel_metrics_gauge",
    `WHERE ${filters.join(" AND ")}`,
    "GROUP BY TimeUnix, Attributes, MetricName",
    "ORDER BY TimeUnix ASC",
    "FORMAT JSON",
  ].join("\n");
};

const fetchFromClickhouse = (
  connection: SignalProviderConnection,
  sql: string,
): TE.TaskEither<Error, Response> =>
  TE.tryCatch(
    () =>
      fetch(connection.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          ...(connection.authRef ? { Authorization: `Basic ${connection.authRef}` } : {}),
          ...((connection.extra?.apiKey as string | undefined)
            ? { "X-ClickHouse-Key": connection.extra!.apiKey as string }
            : {}),
        },
        body: sql,
      }),
    (e) => new Error(String(e)),
  );

// ─── Client ──────────────────────────────────────────────────────────────────

export class ClickhouseMetricSignalProviderClient implements MetricsSignalProviderClient {
  constructor(private readonly connection: SignalProviderConnection) {}

  queryMetrics(query: MetricQuery): TE.TaskEither<Error, MetricQueryResult> {
    return pipe(
      fetchFromClickhouse(this.connection, buildMetricQuery(query)),
      TE.flatMap((res) =>
        TE.tryCatch(
          () => res.json() as Promise<ClickhouseResponse<ClickhouseMetricRow>>,
          (e) => new Error(String(e)),
        ),
      ),
      TE.map((res) => ({
        query,
        series: rowsToTimeSeries(res.data),
      })),
    );
  }
}
