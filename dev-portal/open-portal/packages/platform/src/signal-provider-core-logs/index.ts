import type { LogQuery, LogList } from "../signals-api/index.ts";
import type { TaskEither } from "fp-ts/TaskEither";

export interface LogsSignalProviderClient {
  fetchLogs(query: LogQuery): TaskEither<Error, LogList>;
}
