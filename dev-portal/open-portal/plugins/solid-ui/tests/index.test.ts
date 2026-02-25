import { expect, test } from "vite-plus/test";

// Verify that signal types are structurally sound at runtime
import type { LogEntry, MetricSeries } from "../src/index.ts";

test("LogEntry type structure", () => {
  const entry: LogEntry = {
    id: "1",
    timestamp: new Date().toISOString(),
    level: "info",
    message: "hello world",
    labels: { service: "api" },
  };
  expect(entry.level).toBe("info");
  expect(entry.labels?.service).toBe("api");
});

test("MetricSeries type structure", () => {
  const series: MetricSeries = {
    name: "cpu",
    data: [
      { timestamp: Date.now() - 1000, value: 0.4 },
      { timestamp: Date.now(), value: 0.6 },
    ],
    color: "#0ea5e9",
  };
  expect(series.data.length).toBe(2);
  expect(series.data[0].value).toBeLessThan(1);
});
