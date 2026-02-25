import type { BasePlugin } from "@op/platform/plugins/types";
import * as v from "valibot";
/**
 * S2 EventStream implementation with InMemoryEventBus fallback.
 *
 * This plugin attempts to connect to an S2 streaming server on init.
 * If the connection fails, it gracefully falls back to an in-memory
 * event bus so that local development works without external services.
 *
 * The S2 client is injected as a dependency, allowing the plugin to
 * work even when the S2 SDK is not installed (falls back to in-memory).
 */

// ---------------------------------------------------------------------------
// Event types (mirrored from @op/platform/events/api.ts)
// ---------------------------------------------------------------------------

/** Valibot schema for an event envelope. */
export interface EventEnvelope {
	/** Unique event identifier (ULID or UUID). */
	id: string;
	type: string;
	/** ISO-8601 timestamp when the event was created. */
	timestamp: string;
	/** Logical source of the event, e.g. "catalog-service". */
	source: string;
	/** CloudEvents spec version. */
	specversion?: string;
}

/** A typed event carries a payload of type T. */
export interface TypedEvent<T = unknown> extends EventEnvelope {
	data: T;
}

/** Map of event type names to their payload types. Extend via module augmentation. */
export interface EventTypeMap {
	[key: string]: unknown;
}

/** Extract the payload type for a given event type from EventTypeMap. */
export type EventPayload<
	M extends EventTypeMap,
	T extends string,
> = T extends keyof M ? M[T] : unknown;
/** Handler function signature — receives a typed event and may return a result. */
export type EventHandler<T = unknown, R = void> = (
	event: TypedEvent<T>,
	context: {},
) => R | Promise<R>;

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

/** Subscription handle returned by `subscribe`. */
export interface Subscription {
	id: string;
	unsubscribe(): Promise<void>;
}

/**
 * EventStream is the core abstraction for publishing and subscribing to events.
 *
 * Implementations may be in-memory (development), NATS, Kafka, Redis
 * Streams, or any other transport that supports pub/sub semantics.
 */
export interface EventStream<M extends EventTypeMap = EventTypeMap> {
	init(): Promise<void> | void;
	publish<T>(event: TypedEvent<T>): Promise<string>;
	subscribe<T extends keyof M>(
		type: T | readonly T[],
		handler: EventHandler<M[T]>,
		options?: HandlerOptions,
	): Promise<Subscription>;
	unsubscribe(subscription: Subscription): Promise<void>;
	close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Logger type (mirrored from @op/platform/o11y/api.ts)
// ---------------------------------------------------------------------------

export interface Logger {
	trace(message: string, attributes?: Record<string, unknown>): void;
	info(message: string, attributes?: Record<string, unknown>): void;
	warn(message: string, attributes?: Record<string, unknown>): void;
	error(message: string, attributes?: Record<string, unknown>): void;
	debug(message: string, attributes?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// InMemoryEventBus — simple fallback implementation
// ---------------------------------------------------------------------------

/**
 * Simple in-memory event bus for development and testing.
 * Events are delivered to registered handlers via Promise.allSettled.
 */
export class InMemoryEventBus<M extends EventTypeMap = EventTypeMap>
	implements EventStream<M>
{
	private handlers: Map<keyof M, RegisteredHandler[]> = new Map();
	private closed = false;

	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	init(): void {
		this.logger.info("InMemoryEventBus initializing");
	}

	async publish<T>(event: TypedEvent<T>): Promise<string> {
		if (this.closed) throw new Error("EventBus is closed");
		this.logger.debug(`Publishing event ${event.type} with ID ${event.id}`);

		const registered = this.handlers.get(event.type) ?? [];
		const deliveries = registered.map((rh) => this.deliver(rh, event));
		await Promise.allSettled(deliveries);
		return event.id;
	}

	async subscribe<T extends keyof M>(
		type: T | readonly T[],
		handler: EventHandler<M[T]>,
		options?: HandlerOptions,
	): Promise<Subscription> {
		const types = Array.isArray(type) ? [...type] : [type];
		const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const registered: RegisteredHandler = {
			id,
			handler: handler as EventHandler,
			options: options ?? {},
		};

		for (const t of types) {
			const existing = this.handlers.get(t) ?? [];
			existing.push(registered);
			this.handlers.set(t, existing);
		}

		return {
			id,
			unsubscribe: async () => this.unsubscribeById(id),
		};
	}

	async unsubscribe(subscription: Subscription): Promise<void> {
		await this.unsubscribeById(subscription.id);
	}

	async close(): Promise<void> {
		this.closed = true;
		this.handlers.clear();
	}

	private async deliver(
		rh: RegisteredHandler,
		event: TypedEvent,
	): Promise<void> {
		try {
			await rh.handler(event);
		} catch (err) {
			const retries = rh.options.maxRetries ?? 0;
			if (retries > 0) {
				for (let i = 0; i < retries; i++) {
					try {
						await rh.handler(event);
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

// ---------------------------------------------------------------------------
// S2 Client interface (abstracted for testability and optional dependency)
// ---------------------------------------------------------------------------

/**
 * Minimal interface for an S2 streaming client.
 * Implementations may wrap @s2dev/sdk, a REST client, or any S2 protocol adapter.
 */
export interface S2Client {
	/** Establish connection to S2 server. Throws on failure. */
	connect(): Promise<void>;
	/** Close connection to S2 server. */
	disconnect(): Promise<void>;
	/** Publish data to an S2 stream/topic. Returns event ID. */
	publish(topic: string, data: unknown): Promise<string>;
	/** Subscribe to an S2 stream/topic. */
	subscribe(
		topic: string,
		handler: (data: unknown) => void,
	): Promise<S2Subscription>;
	/** Whether the client is currently connected. */
	isConnected(): boolean;
}

/** Subscription handle returned by S2Client.subscribe. */
export interface S2Subscription {
	unsubscribe(): Promise<void>;
}

/** Configuration for the S2 client. */
export interface S2Config {
	/** S2 server endpoint URL. */
	endpoint: string;
	/** Optional API key for authenticated access. */
	apiKey?: string;
	/** Optional basin name for stream isolation. */
	basin?: string;
}

// ---------------------------------------------------------------------------
// Plugin configuration
// ---------------------------------------------------------------------------

/** Valibot schema for S2 event stream plugin config. */
export const S2EventStreamConfigSchema = v.object({
	endpoint: v.optional(v.string(), "http://localhost:9092"),
	apiKey: v.optional(v.string()),
	basin: v.optional(v.string()),
	timeoutMs: v.optional(v.number(), 3000),
});

export type S2EventStreamConfig = v.InferOutput<
	typeof S2EventStreamConfigSchema
>;

const DEFAULT_TIMEOUT_MS = 3000;

const DEFAULT_CONFIG: S2EventStreamConfig = {
	endpoint: "http://localhost:9092",
	timeoutMs: DEFAULT_TIMEOUT_MS,
};

// ---------------------------------------------------------------------------
// S2EventStream — wraps S2 SDK with EventStream interface
// ---------------------------------------------------------------------------

/**
 * S2-backed event stream implementation.
 *
 * Publishes events to S2 streams and subscribes via S2 consumer groups.
 * Falls back to InMemoryEventBus when S2 is unavailable or operations fail.
 */
export class S2EventStream<M extends EventTypeMap = EventTypeMap>
	implements EventStream<M>
{
	private s2Client: S2Client | null = null;
	private fallback: InMemoryEventBus<M>;
	private connected = false;
	private subscriptions: Map<string, S2Subscription> = new Map();

	private readonly config: S2EventStreamConfig;
	private readonly logger: Logger;
	private readonly s2ClientFactory: () => Promise<S2Client>;

	constructor(
		config: S2EventStreamConfig,
		logger: Logger,
		s2ClientFactory: () => Promise<S2Client>,
	) {
		this.config = config;
		this.logger = logger;
		this.s2ClientFactory = s2ClientFactory;
		this.fallback = new InMemoryEventBus<M>(logger);
	}

	/**
	 * Initialize the S2 connection. If it fails, log a warning and
	 * the implementation will use the in-memory fallback.
	 */
	async init(): Promise<void> {
		this.logger.info("S2EventStream initializing");
		try {
			const client = await this.s2ClientFactory();
			this.s2Client = client;

			const timeout = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			await this.withTimeout(client.connect(), timeout);

			this.connected = true;
			this.logger.info("S2EventStream connected to S2 server");
		} catch (err) {
			this.logger.warn(
				`S2EventStream failed to connect to S2 server (${this.config.endpoint}), ` +
					`falling back to in-memory event bus: ${err instanceof Error ? err.message : String(err)}`,
			);
			this.connected = false;
			this.s2Client = null;
		}
	}

	/**
	 * Publish an event. Uses S2 if connected, otherwise falls back
	 * to the in-memory event bus.
	 */
	async publish<T>(event: TypedEvent<T>): Promise<string> {
		if (this.connected && this.s2Client) {
			try {
				const topic = this.topicForType(event.type);
				return await this.s2Client.publish(topic, event);
			} catch (err) {
				this.logger.warn(
					`S2 publish failed, falling back to in-memory: ${err instanceof Error ? err.message : String(err)}`,
				);
				this.connected = false;
			}
		}
		return this.fallback.publish(event);
	}

	/**
	 * Subscribe to events. Uses S2 if connected, otherwise falls back
	 * to the in-memory event bus.
	 */
	async subscribe<T extends keyof M>(
		type: T | readonly T[],
		handler: EventHandler<M[T]>,
		options?: HandlerOptions,
	): Promise<Subscription> {
		if (this.connected && this.s2Client) {
			const types = Array.isArray(type) ? [...type] : [type];
			const s2Subs: S2Subscription[] = [];

			try {
				for (const t of types) {
					const topic = this.topicForType(String(t));
					const sub = await this.s2Client.subscribe(topic, (data) => {
						void handler(data as TypedEvent<M[T]>);
					});
					s2Subs.push(sub);
				}

				const id = `s2-sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
				const combined: S2Subscription = {
					unsubscribe: async () => {
						await Promise.all(s2Subs.map((s) => s.unsubscribe()));
					},
				};
				this.subscriptions.set(id, combined);

				return {
					id,
					unsubscribe: async () => {
						await combined.unsubscribe();
						this.subscriptions.delete(id);
					},
				};
			} catch (err) {
				this.logger.warn(
					`S2 subscribe failed, falling back to in-memory: ${err instanceof Error ? err.message : String(err)}`,
				);
				this.connected = false;
			}
		}
		return this.fallback.subscribe(type, handler, options);
	}

	/**
	 * Unsubscribe from events.
	 */
	async unsubscribe(subscription: Subscription): Promise<void> {
		const s2Sub = this.subscriptions.get(subscription.id);
		if (s2Sub) {
			await s2Sub.unsubscribe();
			this.subscriptions.delete(subscription.id);
		}
		await this.fallback.unsubscribe(subscription);
	}

	/**
	 * Close the event stream and clean up resources.
	 */
	async close(): Promise<void> {
		// Close all S2 subscriptions
		for (const [id, sub] of this.subscriptions.entries()) {
			try {
				await sub.unsubscribe();
			} catch {
				// Ignore errors during cleanup
			}
			this.subscriptions.delete(id);
		}

		// Disconnect S2 client
		if (this.s2Client) {
			try {
				await this.s2Client.disconnect();
			} catch {
				// Ignore errors during cleanup
			}
			this.s2Client = null;
		}

		this.connected = false;

		// Close fallback
		await this.fallback.close();
		this.logger.info("S2EventStream closed");
	}

	/** Whether the S2 connection is active. */
	get isConnected(): boolean {
		return this.connected;
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private topicForType(type: string): string {
		const basin = this.config.basin ? `${this.config.basin}.` : "";
		return `${basin}${type}`;
	}

	private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((_, reject) =>
				setTimeout(
					() => reject(new Error(`S2 connection timeout after ${ms}ms`)),
					ms,
				),
			),
		]);
	}
}

// ---------------------------------------------------------------------------
// Factory function — creates S2EventStream with InMemoryEventBus fallback
// ---------------------------------------------------------------------------

/**
 * Create an EventStream that attempts S2 connection and falls back
 * to in-memory when S2 is unavailable.
 *
 * @param config - S2 connection configuration
 * @param logger - Platform logger
 * @param s2ClientFactory - Async factory that creates an S2 client.
 *   Defaults to a factory that always throws, triggering in-memory fallback.
 */
export function createEventStream<M extends EventTypeMap = EventTypeMap>(
	config: Partial<S2EventStreamConfig> = {},
	logger: Logger,
	s2ClientFactory?: () => Promise<S2Client>,
): EventStream<M> {
	const resolvedConfig: S2EventStreamConfig = {
		...DEFAULT_CONFIG,
		...config,
	};

	// If no S2 client factory is provided, use one that always fails,
	// which triggers the in-memory fallback. This allows the plugin to work
	// even when the S2 SDK is not installed.
	const fallbackFactory = async (): Promise<S2Client> => {
		throw new Error("S2 SDK not available");
	};

	return new S2EventStream<M>(
		resolvedConfig,
		logger,
		s2ClientFactory ?? fallbackFactory,
	);
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export default {
	name: "events-s2",
	type: "event_stream_provider",
	serverConfig: S2EventStreamConfigSchema,
	clientConfig: undefined as any,
	serverServices: [
		{
			name: "eventStream",
			factory: (services, config?: S2EventStreamConfig) => {
				const logger = services.get("logger");
				const resolvedConfig: Partial<S2EventStreamConfig> = {};
				if (config) {
					if (config.endpoint) resolvedConfig.endpoint = config.endpoint;
					if (config.apiKey) resolvedConfig.apiKey = config.apiKey;
					if (config.basin) resolvedConfig.basin = config.basin;
					if (config.timeoutMs) resolvedConfig.timeoutMs = config.timeoutMs;
				}
				return createEventStream(resolvedConfig, logger);
			},
		},
	],
	clientServices: [],
	eventHandlers: [],
	serverLifecycle: {
		async onInit(services) {
			const logger = services.get("logger");
			const eventStream = services.get<EventStream>("eventStream");
			await eventStream.init();
			logger.info("[events-s2] S2 event stream initialized");
		},
		async onReady(services) {
			const logger = services.get("logger");
			logger.info("[events-s2] S2 event stream ready");
		},
		async onDestroy(services) {
			const logger = services.get("logger");
			const eventStream = services.get<EventStream>("eventStream");
			await eventStream.close();
			logger.info("[events-s2] S2 event stream closed");
		},
	},
	clientLifecycle: {},
} satisfies BasePlugin;
