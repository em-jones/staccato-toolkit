// ─── Common ──────────────────────────────────────────────────────────────────

/** ISO-8601 datetime string */
export type ISODateTime = string;

/** Unique identifier */
export type ID = string;

/** Pagination parameters for list operations */
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

/** Sort direction */
export type SortDirection = "asc" | "desc";

/** Sort specification */
export interface SortSpec {
  field: string;
  direction: SortDirection;
}

/** Time range for signal queries */
export interface TimeRange {
  start: ISODateTime;
  end: ISODateTime;
}

/** Key-value label pair used across signals */
export interface Label {
  key: string;
  value: string;
}

/** Resource metadata shared by all managed entities */
export interface ResourceMeta {
  id: ID;
  name: string;
  description?: string;
  labels?: Label[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Signal Providers ────────────────────────────────────────────────────────

/** The category of observability signal a provider supplies */
export type SignalType = "logs" | "traces" | "metrics";

/** Connection details for a signal backend */
export interface SignalProviderConnection {
  /** Base URL of the backend (e.g. Loki, Tempo, Mimir, ClickHouse) */
  endpoint: string;
  /** Optional authentication config reference */
  authRef?: string;
  /** Arbitrary driver-specific settings */
  extra?: Record<string, unknown>;
}

/** A registered signal data source */
export interface SignalProvider extends ResourceMeta {
  type: SignalType;
  /** The driver plugin that implements this provider (e.g. "loki", "clickhouse-logs") */
  driver: string;
  connection: SignalProviderConnection;
  /** Whether the provider is currently enabled */
  enabled: boolean;
}

export interface CreateSignalProviderInput {
  name: string;
  description?: string;
  labels?: Label[];
  type: SignalType;
  driver: string;
  connection: SignalProviderConnection;
  enabled?: boolean;
}

export interface UpdateSignalProviderInput {
  name?: string;
  description?: string;
  labels?: Label[];
  connection?: Partial<SignalProviderConnection>;
  enabled?: boolean;
}

export interface ListSignalProvidersParams extends PaginationParams {
  type?: SignalType;
  driver?: string;
  enabled?: boolean;
}

/** CRUD contract that a signal-provider plugin must satisfy */
export interface SignalProviderApi {
  create(input: CreateSignalProviderInput): Promise<SignalProvider>;
  get(id: ID): Promise<SignalProvider>;
  list(params?: ListSignalProvidersParams): Promise<PaginatedResponse<SignalProvider>>;
  update(id: ID, input: UpdateSignalProviderInput): Promise<SignalProvider>;
  delete(id: ID): Promise<void>;
  /** Verify the provider's backend is reachable */
  healthCheck(id: ID): Promise<SignalProviderHealthStatus>;
}

export interface SignalProviderHealthStatus {
  providerId: ID;
  healthy: boolean;
  message?: string;
  checkedAt: ISODateTime;
}

// ─── Signal Queries ──────────────────────────────────────────────────────────

/** A saved / reusable query against a signal provider */
export interface SignalQuery extends ResourceMeta {
  providerId: ID;
  signalType: SignalType;
  /** The raw query expression (LogQL, TraceQL, PromQL, SQL, etc.) */
  expression: string;
  /** Default time range when the query is executed without explicit bounds */
  defaultTimeRange?: TimeRange;
}

export interface CreateSignalQueryInput {
  name: string;
  description?: string;
  labels?: Label[];
  providerId: ID;
  signalType: SignalType;
  expression: string;
  defaultTimeRange?: TimeRange;
}

export interface UpdateSignalQueryInput {
  name?: string;
  description?: string;
  labels?: Label[];
  expression?: string;
  defaultTimeRange?: TimeRange;
}

export interface ListSignalQueriesParams extends PaginationParams {
  providerId?: ID;
  signalType?: SignalType;
}

export interface SignalQueryApi {
  create(input: CreateSignalQueryInput): Promise<SignalQuery>;
  get(id: ID): Promise<SignalQuery>;
  list(params?: ListSignalQueriesParams): Promise<PaginatedResponse<SignalQuery>>;
  update(id: ID, input: UpdateSignalQueryInput): Promise<SignalQuery>;
  delete(id: ID): Promise<void>;
  /** Execute a query ad-hoc and return raw results */
  execute(id: ID, timeRange?: TimeRange): Promise<SignalQueryResult>;
}

export interface SignalQueryResult {
  queryId: ID;
  executedAt: ISODateTime;
  data: unknown;
}

// ─── Logs ────────────────────────────────────────────────────────────────────

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogListConfig {
  visibleColumns?: string[];
  filters?: LogFilter[];
  sort?: SortSpec;
  /** Max rows to display in a single page */
  pageSize?: number;
}

export interface LogFilter {
  field: string;
  operator: "eq" | "neq" | "contains" | "regex" | "gt" | "lt" | "gte" | "lte";
  value: string;
}

export interface LogListItem {
  id: ID;
  timestamp: ISODateTime;
  level: LogLevel;
  message: string;
  labels: Label[];
  /** Optional reference to a correlated trace */
  traceId?: ID;
  /** Optional reference to a correlated span */
  spanId?: ID;
  resource?: Record<string, unknown>;
}

export interface LogList {
  config: LogListConfig;
  items: LogListItem[];
  total: number;
}

export interface LogQuery {
  providerId: ID;
  expression: string;
  timeRange: TimeRange;
  filters?: LogFilter[];
  sort?: SortSpec;
  pagination?: PaginationParams;
}

// ─── Traces ──────────────────────────────────────────────────────────────────

export type SpanStatus = "unset" | "ok" | "error";

export interface Span {
  spanId: ID;
  traceId: ID;
  parentSpanId?: ID;
  operationName: string;
  serviceName: string;
  startTime: ISODateTime;
  /** Duration in milliseconds */
  durationMs: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events?: SpanEvent[];
  /** Correlated log item IDs, if available */
  logIds?: ID[];
}

export interface SpanEvent {
  name: string;
  timestamp: ISODateTime;
  attributes?: Record<string, unknown>;
}

export interface Trace {
  traceId: ID;
  rootSpan: Span;
  spans: Span[];
  /** Total duration of the trace in milliseconds */
  durationMs: number;
  serviceSummary: { serviceName: string; spanCount: number }[];
}

export interface TraceQuery {
  providerId: ID;
  expression?: string;
  timeRange: TimeRange;
  serviceName?: string;
  operationName?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  tags?: Label[];
  pagination?: PaginationParams;
}

export interface TraceListItem {
  traceId: ID;
  rootServiceName: string;
  rootOperationName: string;
  startTime: ISODateTime;
  durationMs: number;
  spanCount: number;
  status: SpanStatus;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface TimeSeriesDataPoint {
  timestamp: ISODateTime;
  value: number;
}

export interface TimeSeries {
  labels: Label[];
  dataPoints: TimeSeriesDataPoint[];
}

export interface MetricQuery {
  providerId: ID;
  expression: string;
  timeRange: TimeRange;
  /** Step/resolution interval in seconds */
  stepSeconds?: number;
}

export interface MetricQueryResult {
  query: MetricQuery;
  series: TimeSeries[];
}

// ─── Signal Visualizations ───────────────────────────────────────────────────

export type VisualizationType =
  | "line-chart"
  | "bar-chart"
  | "area-chart"
  | "heatmap"
  | "table"
  | "stat"
  | "gauge"
  | "log-list"
  | "trace-flamegraph"
  | "trace-table";

export interface VisualizationThreshold {
  value: number;
  color: string;
  label?: string;
}

export interface SignalVisualization extends ResourceMeta {
  type: VisualizationType;
  /** The query that feeds data into this visualization */
  queryId: ID;
  /** Display options specific to the visualization type */
  options: VisualizationOptions;
}

export interface VisualizationOptions {
  /** Title shown above the visualization */
  title?: string;
  /** Unit label for values (e.g. "ms", "req/s", "bytes") */
  unit?: string;
  /** Color scheme or explicit color mapping */
  colorScheme?: string;
  thresholds?: VisualizationThreshold[];
  /** Legend visibility */
  showLegend?: boolean;
  /** Type-specific overrides */
  extra?: Record<string, unknown>;
}

export interface CreateSignalVisualizationInput {
  name: string;
  description?: string;
  labels?: Label[];
  type: VisualizationType;
  queryId: ID;
  options: VisualizationOptions;
}

export interface UpdateSignalVisualizationInput {
  name?: string;
  description?: string;
  labels?: Label[];
  type?: VisualizationType;
  queryId?: ID;
  options?: Partial<VisualizationOptions>;
}

export interface ListSignalVisualizationsParams extends PaginationParams {
  type?: VisualizationType;
  queryId?: ID;
}

export interface SignalVisualizationApi {
  create(input: CreateSignalVisualizationInput): Promise<SignalVisualization>;
  get(id: ID): Promise<SignalVisualization>;
  list(params?: ListSignalVisualizationsParams): Promise<PaginatedResponse<SignalVisualization>>;
  update(id: ID, input: UpdateSignalVisualizationInput): Promise<SignalVisualization>;
  delete(id: ID): Promise<void>;
}

// ─── Dashboards ──────────────────────────────────────────────────────────────

/**
 * Grid item placement — compatible with gridstack.js widget options.
 * @see https://github.com/gridstack/gridstack.js
 */
export interface DashboardGridItem {
  /** Column position (0-indexed) */
  x: number;
  /** Row position (0-indexed) */
  y: number;
  /** Width in grid columns */
  w: number;
  /** Height in grid rows */
  h: number;
  /** Minimum width */
  minW?: number;
  /** Minimum height */
  minH?: number;
  /** Maximum width */
  maxW?: number;
  /** Maximum height */
  maxH?: number;
  /** Whether the widget is locked from moving/resizing */
  locked?: boolean;
  /** The visualization rendered inside this grid cell */
  visualizationId: ID;
}

export interface DashboardGridConfig {
  /** Number of columns in the grid (default 12) */
  columns?: number;
  /** Row height in pixels */
  rowHeight?: number;
  /** Gap between grid items in pixels */
  gap?: number;
  /** Allow items to float upward */
  float?: boolean;
  items: DashboardGridItem[];
}

export interface DashboardConfig {
  grid: DashboardGridConfig;
  /** Global time range applied to all panels unless overridden */
  timeRange?: TimeRange;
  /** Auto-refresh interval in seconds (0 = disabled) */
  refreshIntervalSeconds?: number;
  /** Variables that can be referenced in query expressions */
  variables?: DashboardVariable[];
}

export interface DashboardVariable {
  name: string;
  label?: string;
  type: "text" | "select" | "interval";
  defaultValue: string;
  options?: string[];
}

export interface Dashboard extends ResourceMeta {
  config: DashboardConfig;
}

export interface CreateDashboardInput {
  name: string;
  description?: string;
  labels?: Label[];
  config: DashboardConfig;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  labels?: Label[];
  config?: DashboardConfig;
}

export interface ListDashboardsParams extends PaginationParams {
  /** Filter by label */
  labels?: Label[];
}

export interface DashboardApi {
  create(input: CreateDashboardInput): Promise<Dashboard>;
  get(id: ID): Promise<Dashboard>;
  list(params?: ListDashboardsParams): Promise<PaginatedResponse<Dashboard>>;
  update(id: ID, input: UpdateDashboardInput): Promise<Dashboard>;
  delete(id: ID): Promise<void>;
  /** Duplicate a dashboard with a new name */
  clone(id: ID, newName: string): Promise<Dashboard>;
}

// ─── Alerts (stub) ───────────────────────────────────────────────────────────
// Alert rules evaluate signal queries on a schedule and fire notifications.
// Full design TBD — stubbed here for review.

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertState = "inactive" | "pending" | "firing" | "resolved";

export interface AlertRule extends ResourceMeta {
  queryId: ID;
  condition: string;
  severity: AlertSeverity;
  /** Evaluation interval in seconds */
  intervalSeconds: number;
  /** How long the condition must be true before firing */
  forSeconds: number;
  state: AlertState;
  notificationChannelIds: ID[];
}

// ─── Notification Channels (stub) ────────────────────────────────────────────
// Delivery targets for alert notifications. Full design TBD.

export type NotificationChannelType = "email" | "slack" | "webhook" | "pagerduty";

export interface NotificationChannel extends ResourceMeta {
  channelType: NotificationChannelType;
  config: Record<string, unknown>;
  enabled: boolean;
}

// ─── Annotations (stub) ──────────────────────────────────────────────────────
// User-created markers on dashboards for incident timelines, deploys, etc.

export interface Annotation extends ResourceMeta {
  dashboardId: ID;
  /** Point-in-time or range */
  time: ISODateTime;
  endTime?: ISODateTime;
  text: string;
  tags?: string[];
}
