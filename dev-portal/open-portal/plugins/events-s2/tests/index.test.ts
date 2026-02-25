import { describe, expect, it, vi, beforeEach, afterEach } from "vite-plus/test";
import type { Mock } from "vite-plus/test";
import { createEventStream, S2EventStream } from "../src/index.ts";
import type { S2Client, S2Subscription, Logger, TypedEvent } from "../src/index.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  } as unknown as Logger;
}

interface MockS2Client extends S2Client {
  connect: Mock<() => Promise<void>>;
  disconnect: Mock<() => Promise<void>>;
  publish: Mock<(topic: string, data: unknown) => Promise<string>>;
  subscribe: Mock<(topic: string, handler: (data: unknown) => void) => Promise<S2Subscription>>;
  isConnected: Mock<() => boolean>;
}

function createMockS2Client(shouldConnect = true): MockS2Client {
  const handlers = new Map<string, ((data: unknown) => void)[]>();
  return {
    connect: vi.fn().mockImplementation(async () => {
      if (!shouldConnect) throw new Error("Connection refused");
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockImplementation(async (_topic: string, data: unknown) => {
      const event = data as TypedEvent;
      const subs = handlers.get(event.type) ?? [];
      for (const h of subs) {
        h(data);
      }
      return event.id;
    }),
    subscribe: vi
      .fn()
      .mockImplementation(async (topic: string, handler: (data: unknown) => void) => {
        const existing = handlers.get(topic) ?? [];
        existing.push(handler);
        handlers.set(topic, existing);
        return {
          unsubscribe: vi.fn().mockResolvedValue(undefined),
        } as S2Subscription;
      }),
    isConnected: vi.fn().mockReturnValue(shouldConnect),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S2EventStream", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects to S2 when available", async () => {
    const mockClient = createMockS2Client(true);
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = new S2EventStream({ endpoint: "http://localhost:9092" }, logger, factory);

    await stream.init();

    expect(factory).toHaveBeenCalled();
    expect(mockClient.connect).toHaveBeenCalled();
    expect(stream.isConnected).toBe(true);
    expect(logger.info).toHaveBeenCalledWith("S2EventStream connected to S2 server");
  });

  it("falls back to in-memory when S2 connection fails", async () => {
    const mockClient = createMockS2Client(false);
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = new S2EventStream({ endpoint: "http://localhost:9092" }, logger, factory);

    await stream.init();

    expect(mockClient.connect).toHaveBeenCalled();
    expect(stream.isConnected).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("falling back to in-memory event bus"),
    );
  });

  it("publishes events via S2 when connected", async () => {
    const mockClient = createMockS2Client(true);
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = new S2EventStream({ endpoint: "http://localhost:9092" }, logger, factory);

    await stream.init();

    const event: TypedEvent<{ name: string }> = {
      id: "evt-123",
      type: "user.created",
      timestamp: new Date().toISOString(),
      source: "test",
      specversion: "1.0",
      data: { name: "Alice" },
    };

    const result = await stream.publish(event);

    expect(result).toBe("evt-123");
    expect(mockClient.publish).toHaveBeenCalledWith("user.created", event);
  });

  it("falls back to in-memory publish when S2 publish fails", async () => {
    const mockClient = createMockS2Client(true);
    mockClient.publish.mockRejectedValueOnce(new Error("S2 publish error"));
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = new S2EventStream({ endpoint: "http://localhost:9092" }, logger, factory);

    await stream.init();

    const event: TypedEvent<{ name: string }> = {
      id: "evt-456",
      type: "user.created",
      timestamp: new Date().toISOString(),
      source: "test",
      specversion: "1.0",
      data: { name: "Bob" },
    };

    const result = await stream.publish(event);
    expect(result).toBe("evt-456");
    expect(stream.isConnected).toBe(false);
  });

  it("closes S2 connection and subscriptions", async () => {
    const mockClient = createMockS2Client(true);
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = new S2EventStream({ endpoint: "http://localhost:9092" }, logger, factory);

    await stream.init();
    await stream.close();

    expect(mockClient.disconnect).toHaveBeenCalled();
    expect(stream.isConnected).toBe(false);
    expect(logger.info).toHaveBeenCalledWith("S2EventStream closed");
  });

  it("times out connection attempt", async () => {
    const mockClient = createMockS2Client(true);
    mockClient.connect.mockImplementation(
      () => new Promise<void>((resolve) => setTimeout(resolve, 10000)),
    );
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = new S2EventStream(
      { endpoint: "http://localhost:9092", timeoutMs: 100 },
      logger,
      factory,
    );

    const initPromise = stream.init();
    await vi.advanceTimersByTimeAsync(100);
    await initPromise;

    expect(stream.isConnected).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("falling back to in-memory event bus"),
    );
  });

  it("publishes to in-memory when S2 factory throws", async () => {
    const factory = vi.fn().mockRejectedValue(new Error("S2 SDK not available"));

    const stream = new S2EventStream({ endpoint: "http://localhost:9092" }, logger, factory);

    await stream.init();

    expect(stream.isConnected).toBe(false);

    const event: TypedEvent<{ name: string }> = {
      id: "evt-789",
      type: "user.created",
      timestamp: new Date().toISOString(),
      source: "test",
      specversion: "1.0",
      data: { name: "Charlie" },
    };

    const received: unknown[] = [];
    await stream.subscribe("user.created", (e) => {
      received.push(e);
    });

    await stream.publish(event);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
  });
});

describe("createEventStream", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it("creates S2EventStream with provided S2 client factory", async () => {
    const mockClient = createMockS2Client(true);
    const factory = vi.fn().mockResolvedValue(mockClient);

    const stream = createEventStream({ endpoint: "http://s2.example.com" }, logger, factory);

    await (stream as S2EventStream).init();
    expect(mockClient.connect).toHaveBeenCalled();
  });

  it("falls back to in-memory when no S2 client factory provided", async () => {
    const stream = createEventStream({}, logger);

    await (stream as S2EventStream).init();

    expect((stream as S2EventStream).isConnected).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("S2 SDK not available"));
  });

  it("uses default endpoint when not specified", async () => {
    const stream = createEventStream({}, logger);

    await (stream as S2EventStream).init();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("http://localhost:9092"));
  });
});
