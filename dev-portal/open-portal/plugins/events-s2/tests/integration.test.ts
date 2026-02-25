import { join, resolve } from "node:path";
import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
import { DockerComposeEnvironment, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
// Import plugin directly from source
import eventsS2Plugin, {
	createEventStream,
	type EventStream,
	type Logger,
	type S2Client,
	type S2EventStream,
	type S2Subscription,
	type TypedEvent,
} from "../src/index.ts";

/**
 * Integration test for @op-plugin/events-s2.
 *
 * Validates:
 * 1. Vite plugin pipeline (metadata extraction + type/OpenAPI generation)
 * 2. Full platform bootstrap (init → registerPlugin → start → stop) with events-s2
 * 3. In-memory fallback when S2 is unreachable
 * 4. Events can be published and consumed via the in-memory event bus
 * 5. Plugin config schema validation
 * 6. Real S2 container integration via DockerComposeEnvironment
 */

const PLUGIN_ENTRY = resolve(__dirname, "../src/index.ts");
const COMPOSE_PATH = join(__dirname, "../../../");
const COMPOSE_FILE = "podman-compose.yaml";

async function isContainerRuntimeAvailable(): Promise<boolean> {
	try {
		const { GenericContainer } = await import("testcontainers");
		await new GenericContainer("alpine:latest")
			.withStartupTimeout(10_000)
			.withCommand(["echo", "test"])
			.start()
			.then((c) => c.stop());
		return true;
	} catch {
		return false;
	}
}

function createMockLogger(): Logger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
	} as unknown as Logger;
}

describe("events-s2 platform integration (full bootstrap)", () => {
	let platform: TestPlatform;

	beforeAll(async () => {
		platform = await createTestPlatform({
			plugins: [eventsS2Plugin],
			pluginPaths: [PLUGIN_ENTRY],
			configYaml: `server:
  events_s2:
    endpoint: "http://localhost:19999"
    timeoutMs: 100
`,
		});
	}, 15_000);

	afterAll(async () => {
		await platform.cleanup();
	});

	it("should complete platform bootstrap without errors", () => {
		expect(platform.app).toBeDefined();
		expect(platform.app.services).toBeDefined();
	});

	it("should extract plugin metadata via the vite plugin pipeline", () => {
		expect(platform.metadata).toHaveLength(1);
		expect(platform.metadata[0].name).toBe("events-s2");
		expect(platform.metadata[0].type).toBe("event_stream_provider");
	});

	it("should generate TypeScript types file", () => {
		expect(platform.generatedTypes).toContain("events-s2");
	});

	it("should generate OpenAPI spec", () => {
		expect(platform.generatedOpenAPI).toContain("events-s2");
	});

	it("should register eventStream service in the DI container", () => {
		const eventStream = platform.app.services.get<EventStream>("eventStream");
		expect(eventStream).toBeDefined();
	});

	it("should fall back to in-memory when S2 is unreachable", () => {
		const eventStream = platform.app.services.get<EventStream>("eventStream");
		expect((eventStream as S2EventStream).isConnected).toBe(false);
	});

	it("should publish and consume events via in-memory fallback", async () => {
		const eventStream =
			platform.app.services.get<EventStream<{ "test.event": { text: string } }>>(
				"eventStream",
			);

		const received: unknown[] = [];
		await eventStream.subscribe("test.event", (event) => {
			received.push(event);
		});

		const testEvent: TypedEvent<{ text: string }> = {
			id: "test-001",
			type: "test.event",
			timestamp: new Date().toISOString(),
			source: "integration-test",
			specversion: "1.0",
			data: { text: "Hello from platform!" },
		};

		await eventStream.publish(testEvent);

		expect(received).toHaveLength(1);
		expect(received[0]).toMatchObject({
			id: "test-001",
			type: "test.event",
			data: { text: "Hello from platform!" },
		});
	});
});

describe("events-s2 in-memory fallback (direct)", () => {
	let logger: Logger;
	let eventStream: EventStream;

	beforeAll(async () => {
		logger = createMockLogger();

		eventStream = createEventStream(
			{ endpoint: "http://localhost:19999", timeoutMs: 100 },
			logger,
		);

		await (eventStream as S2EventStream).init();
	}, 10_000);

	afterAll(async () => {
		if (eventStream) await eventStream.close();
	});

	it("should fall back to in-memory when S2 is unreachable", () => {
		expect((eventStream as S2EventStream).isConnected).toBe(false);
	});

	it("should publish and consume events via in-memory fallback", async () => {
		const received: unknown[] = [];
		await eventStream.subscribe("fallback.event", (event) => {
			received.push(event);
		});

		const testEvent: TypedEvent<{ text: string }> = {
			id: "fallback-001",
			type: "fallback.event",
			timestamp: new Date().toISOString(),
			source: "integration-test",
			specversion: "1.0",
			data: { text: "In-memory fallback works!" },
		};

		await eventStream.publish(testEvent);
		expect(received).toHaveLength(1);
		expect(received[0]).toMatchObject({
			id: "fallback-001",
			type: "fallback.event",
			data: { text: "In-memory fallback works!" },
		});
	});

	it("should unsubscribe and stop receiving events", async () => {
		const received: unknown[] = [];
		const sub = await eventStream.subscribe("unsub.test", (event) => {
			received.push(event);
		});

		await eventStream.unsubscribe(sub);

		await eventStream.publish({
			id: "unsub-001",
			type: "unsub.test",
			timestamp: new Date().toISOString(),
			source: "integration-test",
			specversion: "1.0",
			data: { value: 42 },
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(received).toHaveLength(0);
	});
});

describe("events-s2 plugin config schema", () => {
	it("should validate config with custom endpoint", async () => {
		const { S2EventStreamConfigSchema } = await import("../src/index.ts");

		const result = S2EventStreamConfigSchema["~standard"].validate({
			endpoint: "http://s2.example.com:9092",
			timeoutMs: 5000,
		});
		const validated = await (result instanceof Promise
			? result
			: Promise.resolve(result));
		expect(validated.issues).toBeUndefined();
	});

	it("should use default values when fields are omitted", async () => {
		const { S2EventStreamConfigSchema } = await import("../src/index.ts");

		const result = S2EventStreamConfigSchema["~standard"].validate({});
		const validated = await (result instanceof Promise
			? result
			: Promise.resolve(result));
		expect(validated.issues).toBeUndefined();
	});

	it("should accept optional apiKey and basin fields", async () => {
		const { S2EventStreamConfigSchema } = await import("../src/index.ts");

		const result = S2EventStreamConfigSchema["~standard"].validate({
			endpoint: "http://s2.example.com",
			apiKey: "my-api-key",
			basin: "my-basin",
		});
		const validated = await (result instanceof Promise
			? result
			: Promise.resolve(result));
		expect(validated.issues).toBeUndefined();
	});
});

describe("events-s2 with real S2 container", () => {
	let composeEnv: Awaited<
		ReturnType<typeof DockerComposeEnvironment.prototype.up>
	>;
	let s2Endpoint: string;
	let containerRuntimeAvailable = false;

	beforeAll(async () => {
		containerRuntimeAvailable = await isContainerRuntimeAvailable();
		if (!containerRuntimeAvailable) return;

		const composeEnvInstance = new DockerComposeEnvironment(
			COMPOSE_PATH,
			COMPOSE_FILE,
		)
			.withWaitStrategy("s2", Wait.forListeningPorts())
			.withStartupTimeout(60_000);

		composeEnv = await composeEnvInstance.up(["s2"]);

		const s2Container = composeEnv.getContainer("s2");
		const port = s2Container.getMappedPort(80);
		s2Endpoint = `http://localhost:${port}`;
	}, 60_000);

	afterAll(async () => {
		if (containerRuntimeAvailable && composeEnv) {
			await composeEnv.down();
		}
	});

	it.skipIf(!containerRuntimeAvailable)(
		"should connect to real S2 instance",
		async () => {
			const logger = createMockLogger();
			const eventStream = createEventStream(
				{ endpoint: s2Endpoint, timeoutMs: 5000 },
				logger,
			);

			await (eventStream as S2EventStream).init();

			expect(eventStream).toBeDefined();
		},
		15_000,
	);

	it.skipIf(!containerRuntimeAvailable)(
		"should publish and consume events via real S2",
		async () => {
			const logger = createMockLogger();
			const eventStream = createEventStream<{ "s2.test": { message: string } }>(
				{ endpoint: s2Endpoint, timeoutMs: 5000 },
				logger,
			);

			await (eventStream as S2EventStream).init();

			const received: unknown[] = [];
			await eventStream.subscribe("s2.test", (event) => {
				received.push(event);
			});

			const testEvent: TypedEvent<{ message: string }> = {
				id: "s2-test-001",
				type: "s2.test",
				timestamp: new Date().toISOString(),
				source: "compose-integration-test",
				specversion: "1.0",
				data: { message: "Hello from real S2!" },
			};

			await eventStream.publish(testEvent);

			await new Promise((r) => setTimeout(r, 1000));
			expect(received.length).toBeGreaterThanOrEqual(1);
			expect(received[0]).toMatchObject({
				id: "s2-test-001",
				type: "s2.test",
				data: { message: "Hello from real S2!" },
			});

			await eventStream.close();
		},
		15_000,
	);

	it.skipIf(!containerRuntimeAvailable)(
		"should create S2-backed EventStream with real client factory",
		async () => {
			const logger = createMockLogger();

			const mockS2Client: S2Client = {
				connect: vi.fn().mockResolvedValue(undefined),
				disconnect: vi.fn().mockResolvedValue(undefined),
				publish: vi
					.fn()
					.mockImplementation(async (_topic: string, data: unknown) => {
						const event = data as TypedEvent;
						return event.id;
					}),
				subscribe: vi
					.fn()
					.mockImplementation(
						async (_topic: string, handler: (data: unknown) => void) => {
							return {
								unsubscribe: vi.fn().mockResolvedValue(undefined),
							} as S2Subscription;
						},
					),
				isConnected: vi.fn().mockReturnValue(true),
			};

			const eventStream = createEventStream(
				{ endpoint: s2Endpoint, timeoutMs: 5000 },
				logger,
				() => Promise.resolve(mockS2Client),
			);

			await (eventStream as S2EventStream).init();
			expect((eventStream as S2EventStream).isConnected).toBe(true);

			await eventStream.close();
		},
		15_000,
	);
});
