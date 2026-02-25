/**
 * Event system core — defines the contract for event producers, consumers,
 * and the event bus that connects them.
 *
 * This plugin is engine-agnostic.  Implementations (e.g. in-memory, NATS,
 * Kafka) implement the `EventBus` interface and register themselves with
 * the core-services DI container.
 */

import type { UpDownCounter } from "@opentelemetry/api";
import type { Logger, MeterBuilder } from "../o11y/types.ts";
import type {
  EventHandler,
  EventStream,
  EventTypeMap,
  HandlerOptions,
  RegisteredHandler,
  Subscription,
  TypedEvent,
} from "./types.ts";

// ---------------------------------------------------------------------------
// In-memory event bus implementation (development default)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory event bus for development and testing.
 * Events are delivered synchronously to registered handlers.
 */
export class InMemoryEventBus<M extends EventTypeMap = EventTypeMap> implements EventStream {
  private handlers: Map<keyof M, RegisteredHandler[]> = new Map();
  private closed = false;
  private subscriptionsCounter: UpDownCounter;

  constructor(
    private readonly logger: Logger,
    private readonly meterBuilder: MeterBuilder,
  ) {
    this.subscriptionsCounter = this.meterBuilder.createMeter(
      "event_subscriptions",
      "upDownCounter",
    );
  }

  init() {
    this.logger.info("InMemoryEventBus initializing");
  }
  async publish<T>(event: TypedEvent<T>): Promise<string> {
    if (this.closed) throw new Error("EventBus is closed");
    this.logger.debug(`Publishing event ${event.type} with ID ${event.id}`);

    const registered = this.handlers.get(event.type) ?? [];
    this.logger.debug(`Found ${registered.length} handlers for event type ${event.type}`);

    // Deliver to matching handlers
    const deliveries = registered.map((rh) => this.deliver(rh, event));

    await Promise.allSettled(deliveries);
    return event.id;
  }

  async subscribe<T extends keyof M>(
    type: T | readonly T[],
    handler: EventHandler<Record<string, unknown>, M[T]>,
    options?: HandlerOptions,
  ) {
    const types = Array.isArray(type) ? [...type] : [type];
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const registered: RegisteredHandler = {
      id,
      handler: handler as unknown as EventHandler,
      options: options ?? {},
    };

    for (const t of types) {
      const existing = this.handlers.get(t) ?? [];
      existing.push(registered);
      this.handlers.set(t, existing);
    }

    this.subscriptionsCounter.add(1);
    this.logger.debug(`Subscription ${id} registered for event type(s): ${types.join(", ")}`);
    return {
      id,
      unsubscribe: async () => this.unsubscribeById(id),
    };
  }

  async unsubscribe(subscription: Subscription): Promise<void> {
    await this.unsubscribeById(subscription.id);
    this.subscriptionsCounter.add(-1);
    this.logger.debug(`Subscription ${subscription.id} removed`);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.handlers.clear();
    this.logger.info("InMemoryEventBus closed");
  }

  private async deliver(rh: RegisteredHandler, event: TypedEvent): Promise<void> {
    const context = {
      services: { get: () => undefined } as any,
      abortSignal: AbortSignal.timeout(30_000),
      traceId: event.id,
    };
    try {
      await rh.handler(event, context);
    } catch (err) {
      const retries = rh.options.maxRetries ?? 0;
      if (retries > 0) {
        for (let i = 0; i < retries; i++) {
          try {
            await rh.handler(event, context);
            this.logger.debug(
              `Event handler ${rh.id} succeeded on retry ${i + 1} for event ${event.type}`,
            );
            return;
          } catch {
            // Continue retrying
          }
        }
      }
      this.logger.error(
        `Event handler ${rh.id} failed for event ${event.type}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async unsubscribeById(id: string): Promise<void> {
    for (const [type, handlers] of this.handlers.entries()) {
      const filtered = handlers.filter((h) => h.id !== id);
      if (filtered.length === 0) {
        this.handlers.delete(type);
      } else {
        this.handlers.set(type, filtered);
      }
    }
  }
}
