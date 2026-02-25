import type { Counter, Gauge, MeterOptions, UpDownCounter } from "@opentelemetry/api";
import type { Histogram } from "perf_hooks";

export type MetricMap = {
  gauge: Gauge;
  histogram: Histogram;
  counter: Counter;
  upDownCounter: UpDownCounter;
};

export interface MeterBuilder {
  createMeter<T extends keyof MetricMap>(
    name: string,
    type: T,
    options?: MeterOptions,
  ): MetricMap[T];
}

export interface Logger {
  trace(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
  debug(message: string, attributes?: Record<string, unknown>): void;
}
