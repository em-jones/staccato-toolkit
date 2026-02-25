import type { Attributes, Meter, MeterOptions, MetricOptions } from "@opentelemetry/api";
import { metrics } from "@opentelemetry/api";
import pino from "pino";
import type { Plugin } from "../plugins/types.ts";
import type { Logger, MetricMap } from "./types.ts";

export class PinoLogger implements Logger {
  private logger: pino.Logger;
  constructor(plugin: Plugin) {
    this.logger = pino({ msgPrefix: `[${plugin.name}] ` });
  }
  trace(message: string, attributes?: Record<string, unknown>) {
    this.logger.trace(attributes, message);
  }
  info(message: string, attributes?: Record<string, unknown>) {
    this.logger.info(attributes, message);
  }
  warn(message: string, attributes?: Record<string, unknown>) {
    this.logger.warn(attributes, message);
  }
  error(message: string, attributes?: Record<string, unknown>) {
    this.logger.error(attributes, message);
  }
  debug(message: string, attributes?: Record<string, unknown>) {
    this.logger.debug(attributes, message);
  }
}

const createMeters = (
  pluginName: string,
  meters: Record<string, MeterOptions>,
): Record<string, Meter> =>
  Object.entries(meters ?? {}).reduce(
    (meters, [name, options]) => {
      meters[name] = metrics.getMeter(`${pluginName}.${name}`, "0.1", options);
      return meters;
    },
    {} as Record<string, Meter>,
  );

export class MeterBuilder<MeterName extends string = string> {
  private meters: Record<MeterName, Meter>;
  constructor(plugin: Plugin) {
    this.meters = createMeters(plugin.name, plugin.meters ?? {});
  }

  createMetric<TAttributes extends Attributes, T extends keyof MetricMap>(
    meterName: MeterName,
    name: string,
    type: T,
    options?: MetricOptions,
  ): MetricMap[T] {
    const meter = this.meters[meterName];
    if (!meter) throw new Error(`Meter ${meterName} not found for plugin ${meterName}`);
    let metric: MetricMap[T];
    switch (type) {
      case "gauge":
        metric = meter.createGauge<TAttributes>(name, options) as MetricMap[T];
        break;
      case "histogram":
        metric = meter.createHistogram<TAttributes>(name, options) as MetricMap[T];
        break;
      case "counter":
        metric = meter.createCounter(name, options) as MetricMap[T];
        break;
      case "upDownCounter":
        metric = meter.createUpDownCounter(name, options) as MetricMap[T];
        break;
      default:
        throw new Error(`Unsupported meter type: ${type}`);
    }
    return metric;
  }
}
