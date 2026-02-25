import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { match } from "ts-pattern";
import type {
  TraceQuery,
  TraceListItem,
  Trace,
  Span,
  SpanStatus,
  ID,
  SignalProviderConnection,
} from "@op/platform/signals-api";
import type { TracesSignalProviderClient } from "@op/platform/signal-provider-core-traces";

// ─── ClickHouse response shapes ───────────────────────────────────────────────

interface ClickhouseResponse<T> {
  data: T[];
  rows: number;
}

interface ClickhouseSpanRow {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number; // nanoseconds
  StatusCode: string;
  SpanAttributes: Record<string, string>;
  Events_Name?: string[];
  Events_Timestamp?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toSpanStatus = (code: string): SpanStatus =>
  match(code)
    .with("STATUS_CODE_OK", "Ok", "ok", () => "ok" as const)
    .with("STATUS_CODE_ERROR", "Error", "error", () => "error" as const)
    .otherwise(() => "unset" as const);

const rowToSpan = (row: ClickhouseSpanRow): Span => ({
  spanId: row.SpanId,
  traceId: row.TraceId,
  parentSpanId: row.ParentSpanId || undefined,
  operationName: row.SpanName,
  serviceName: row.ServiceName,
  startTime: row.Timestamp,
  durationMs: Math.round(row.Duration / 1_000_000),
  status: toSpanStatus(row.StatusCode),
  attributes: row.SpanAttributes,
  events: row.Events_Name?.map((name, i) => ({
    name,
    timestamp: row.Events_Timestamp?.[i] ?? row.Timestamp,
  })),
});

const buildTraceListQuery = (query: TraceQuery): string => {
  const filters: string[] = [
    `Timestamp >= '${query.timeRange.start}'`,
    `Timestamp <= '${query.timeRange.end}'`,
    "ParentSpanId = ''",
  ];

  if (query.serviceName) filters.push(`ServiceName = '${query.serviceName}'`);
  if (query.operationName) filters.push(`SpanName = '${query.operationName}'`);
  if (query.minDurationMs) filters.push(`Duration >= ${query.minDurationMs * 1_000_000}`);
  if (query.maxDurationMs) filters.push(`Duration <= ${query.maxDurationMs * 1_000_000}`);
  query.tags?.forEach(({ key, value }) => filters.push(`SpanAttributes['${key}'] = '${value}'`));

  const limit = query.pagination?.limit ?? 50;
  const offset = query.pagination?.offset ?? 0;

  return [
    "SELECT",
    "  TraceId, SpanName, ServiceName, Timestamp,",
    "  Duration, StatusCode,",
    "  (SELECT count() FROM otel_traces t2 WHERE t2.TraceId = otel_traces.TraceId) AS SpanCount",
    "FROM otel_traces",
    `WHERE ${filters.join(" AND ")}`,
    "ORDER BY Timestamp DESC",
    `LIMIT ${limit} OFFSET ${offset}`,
    "FORMAT JSON",
  ].join("\n");
};

const buildSpansQuery = (traceId: ID): string => `
SELECT TraceId, SpanId, ParentSpanId, SpanName, ServiceName,
       Timestamp, Duration, StatusCode, SpanAttributes,
       Events.Name AS Events_Name, Events.Timestamp AS Events_Timestamp
FROM otel_traces
WHERE TraceId = '${traceId}'
ORDER BY Timestamp ASC
FORMAT JSON
`;

interface TraceListRow {
  TraceId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanCount: number;
}

const rowToTraceListItem = (row: TraceListRow): TraceListItem => ({
  traceId: row.TraceId,
  rootServiceName: row.ServiceName,
  rootOperationName: row.SpanName,
  startTime: row.Timestamp,
  durationMs: Math.round(row.Duration / 1_000_000),
  spanCount: row.SpanCount,
  status: toSpanStatus(row.StatusCode),
});

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

const parseJson = <T>(res: Response): TE.TaskEither<Error, ClickhouseResponse<T>> =>
  TE.tryCatch(
    () => res.json() as Promise<ClickhouseResponse<T>>,
    (e) => new Error(String(e)),
  );

// ─── Client ──────────────────────────────────────────────────────────────────

export class ClickhouseTraceSignalProviderClient implements TracesSignalProviderClient {
  constructor(private readonly connection: SignalProviderConnection) {}

  fetchTraces(query: TraceQuery): TE.TaskEither<Error, TraceListItem[]> {
    return pipe(
      fetchFromClickhouse(this.connection, buildTraceListQuery(query)),
      TE.flatMap(parseJson<TraceListRow>),
      TE.map((res) => res.data.map(rowToTraceListItem)),
    );
  }

  getTrace(traceId: ID): TE.TaskEither<Error, Trace> {
    return pipe(
      fetchFromClickhouse(this.connection, buildSpansQuery(traceId)),
      TE.flatMap(parseJson<ClickhouseSpanRow>),
      TE.flatMap((res) => {
        if (res.rows === 0) {
          return TE.left(new Error(`Trace ${traceId} not found`));
        }
        const spans = res.data.map(rowToSpan);
        const rootSpan = spans.find((s) => !s.parentSpanId) ?? spans[0];
        const serviceSummary = Object.entries(
          spans.reduce<Record<string, number>>((acc, s) => {
            acc[s.serviceName] = (acc[s.serviceName] ?? 0) + 1;
            return acc;
          }, {}),
        ).map(([serviceName, spanCount]) => ({ serviceName, spanCount }));
        return TE.right<Error, Trace>({
          traceId,
          rootSpan,
          spans,
          durationMs: spans.reduce((max, s) => Math.max(max, s.durationMs), 0),
          serviceSummary,
        });
      }),
    );
  }
}
