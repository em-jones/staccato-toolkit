import type { TraceQuery, TraceListItem, Trace, ID } from "../signals-api/index.ts";
import type { TaskEither } from "fp-ts/TaskEither";

export interface TracesSignalProviderClient {
  fetchTraces(query: TraceQuery): TaskEither<Error, TraceListItem[]>;
  getTrace(traceId: ID): TaskEither<Error, Trace>;
}
