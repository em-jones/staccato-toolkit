import type { InferOutput } from "valibot";
import { minLength, object, optional, pipe, string } from "valibot";
import type { ServiceContainer } from "../services/types.ts";
// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Valibot schema for an event envelope. */
export const EventEnvelopeBaseSchema = object({
  /** Unique event identifier (ULID or UUID). */
  id: pipe(string(), minLength(1)),
  type: string(),
  /** ISO-8601 timestamp when the event was created. */
  timestamp: string(),
  /** Logical source of the event, e.g. "catalog-service". */
  source: string(),
  /** CloudEvents spec version. */
  specversion: optional(string(), "1.0"),
});

export type EventEnvelope = InferOutput<typeof EventEnvelopeBaseSchema>;

export type TypeToDataMap<T extends { type: string; data: unknown }> = {
  [K in T["type"]]: Extract<T, { type: K }>["data"];
};

/** A typed event carries a payload of type T. */
export interface TypedEvent<T = unknown> extends EventEnvelope {
  data: T;
}

/** Map of event type names to their payload types. Extend via module augmentation. */
export interface EventTypeMap {
  [key: string]: unknown;
}

/** Extract the payload type for a given event type from EventTypeMap. */
export type EventPayload<M extends EventTypeMap, T extends string> = T extends keyof M
  ? M[T]
  : unknown;

// ---------------------------------------------------------------------------
// Event handler types
// ---------------------------------------------------------------------------
interface EventContext<TServices extends Record<string, unknown> = Record<string, unknown>> {
  services: ServiceContainer<TServices>;
  abortSignal: AbortSignal;
  traceId: string;
}

/**
 * Handler function signature — receives a typed event and may return
 * a result.  Returning a promise makes the handler async-capable.
 */
export type EventHandler<
  TServices extends Record<string, unknown> = Record<string, unknown>,
  T = unknown,
  R = void,
> = (event: TypedEvent<T>, context: EventContext<TServices>) => R | Promise<R>;

/** Handler registration options. */
export interface HandlerOptions {
  /** Filter events by source glob (e.g. "catalog-*"). */
  sourceFilter?: string;
  /** Only handle events matching these types. */
  types?: string[];
  /** Maximum number of retries on handler failure. */
  maxRetries?: number;
  /** Whether to process events in order (default: false = fire-and-forget). */
  ordered?: boolean;
}

/** Registered handler with its options. */
export interface RegisteredHandler {
  id: string;
  handler: EventHandler;
  options: HandlerOptions;
}

// ---------------------------------------------------------------------------
// Event stream interface
// ---------------------------------------------------------------------------

/**
 * EventStream is the core abstraction for publishing and subscribing to events.
 *
 * Implementations may be in-memory (development), NATS, Kafka, Redis
 * Streams, or any other transport that supports pub/sub semantics.
 */
export interface EventStream<
  M extends EventTypeMap = EventTypeMap,
  TServices extends Record<string, unknown> = Record<string, unknown>,
> {
  init(): Promise<void> | void;
  /**
   * Publish an event to the bus.
   * Returns the event ID once the event has been accepted.
   */
  publish<T>(event: TypedEvent<T>): Promise<string>;

  /**
   * Subscribe to events matching the given type pattern.
   * Returns a subscription handle that can be used to unsubscribe.
   *
   * @param type - Event type (e.g. "user.created"). Extend EventTypeMap via module augmentation.
   * @param handler - Handler receives typed event with payload matching the event type.
   */
  subscribe<T extends keyof M>(
    type: T | readonly T[],
    handler: EventHandler<TServices, M[T]>,
    options?: HandlerOptions,
  ): Promise<Subscription>;

  /**
   * Unsubscribe from events.
   */
  unsubscribe(subscription: Subscription): Promise<void>;

  /**
   * Close the event bus and clean up resources.
   */
  close(): Promise<void>;
}

/** Subscription handle returned by `subscribe`. */
export interface Subscription {
  id: string;
  unsubscribe(): Promise<void>;
}
