import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";
import { match } from "ts-pattern";
import type {
  LogQuery,
  LogList,
  LogListItem,
  LogLevel,
  Label,
  SignalProviderConnection,
} from "@op/platform/signals-api";
import type { LogsSignalProviderClient } from "@op/platform/signal-provider-core-logs";

// ─── ClickHouse HTTP response shape ──────────────────────────────────────────

interface ClickhouseResponse<T> {
  data: T[];
  rows: number;
}

interface ClickhouseLogRow {
  log_id: string;
  Timestamp: string;
  SeverityText: string;
  Body: string;
  ResourceAttributes: Record<string, string>;
  LogAttributes: Record<string, string>;
  TraceId: string;
  SpanId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toLevel = (severity: string): LogLevel =>
  match(severity.toLowerCase())
    .with("trace", () => "trace" as const)
    .with("debug", () => "debug" as const)
    .with("warn", "warning", () => "warn" as const)
    .with("error", () => "error" as const)
    .with("fatal", "critical", () => "fatal" as const)
    .otherwise(() => "info" as const);

const recordToLabels = (r: Record<string, string>): Label[] =>
  Object.entries(r).map(([key, value]) => ({ key, value }));

const rowToLogListItem = (row: ClickhouseLogRow): LogListItem => ({
  id: row.log_id,
  timestamp: row.Timestamp,
  level: toLevel(row.SeverityText),
  message: row.Body,
  labels: [...recordToLabels(row.ResourceAttributes), ...recordToLabels(row.LogAttributes)],
  traceId: row.TraceId || undefined,
  spanId: row.SpanId || undefined,
});

const buildLogsQuery = (query: LogQuery): string => {
  const filters: string[] = [
    `Timestamp >= '${query.timeRange.start}'`,
    `Timestamp <= '${query.timeRange.end}'`,
  ];

  if (query.expression) {
    filters.push(`Body LIKE '%${query.expression.replace(/'/g, "''")}%'`);
  }

  query.filters?.forEach((f) => {
    const escaped = f.value.replace(/'/g, "''");
    const clause = match(f.operator)
      .with("eq", () => `${f.field} = '${escaped}'`)
      .with("neq", () => `${f.field} != '${escaped}'`)
      .with("contains", () => `${f.field} LIKE '%${escaped}%'`)
      .with("regex", () => `match(${f.field}, '${escaped}')`)
      .with("gt", () => `${f.field} > '${escaped}'`)
      .with("lt", () => `${f.field} < '${escaped}'`)
      .with("gte", () => `${f.field} >= '${escaped}'`)
      .with("lte", () => `${f.field} <= '${escaped}'`)
      .exhaustive();
    filters.push(clause);
  });

  const orderField = query.sort?.field ?? "Timestamp";
  const orderDir = query.sort?.direction?.toUpperCase() ?? "DESC";
  const limit = query.pagination?.limit ?? 100;
  const offset = query.pagination?.offset ?? 0;

  return [
    "SELECT",
    "  generateUUIDv4() AS log_id,",
    "  Timestamp,",
    "  SeverityText,",
    "  Body,",
    "  ResourceAttributes,",
    "  LogAttributes,",
    "  TraceId,",
    "  SpanId",
    "FROM otel_logs",
    `WHERE ${filters.join(" AND ")}`,
    `ORDER BY ${orderField} ${orderDir}`,
    `LIMIT ${limit} OFFSET ${offset}`,
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

export class ClickhouseLogSignalProviderClient implements LogsSignalProviderClient {
  constructor(private readonly connection: SignalProviderConnection) {}

  fetchLogs(query: LogQuery): TE.TaskEither<Error, LogList> {
    const sql = buildLogsQuery(query);
    return pipe(
      fetchFromClickhouse(this.connection, sql),
      TE.flatMap((res) =>
        TE.tryCatch(
          () => res.json() as Promise<ClickhouseResponse<ClickhouseLogRow>>,
          (e) => new Error(String(e)),
        ),
      ),
      TE.map((res) => ({
        config: {
          filters: query.filters,
          sort: pipe(
            O.fromNullable(query.sort),
            O.getOrElse(() => undefined as typeof query.sort),
          ),
        },
        items: res.data.map(rowToLogListItem),
        total: res.rows,
      })),
    );
  }
}
