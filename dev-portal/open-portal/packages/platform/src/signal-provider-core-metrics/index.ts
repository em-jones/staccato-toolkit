import type { MetricQuery, MetricQueryResult } from "../signals-api/index.ts";
import type { TaskEither } from "fp-ts/TaskEither";

export interface MetricsSignalProviderClient {
  queryMetrics(query: MetricQuery): TaskEither<Error, MetricQueryResult>;
}
