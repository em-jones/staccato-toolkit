import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

const env = createEnv({
  server: {
    DATABASE_URL: v.optional(v.string(), "dev.db"),
    SERVER_URL: v.optional(v.string()),
    OTEL_EXPORTER_OTLP_ENDPOINT: v.optional(v.string()),
    OTEL_SERVICE_NAME: v.optional(v.string(), "openport"),
    OPENPORT_AUTH_MOCK: v.optional(v.literal("true", "false")),
    OPENPORT_SELF_INTROSPECTION: v.optional(v.literal("true", "false")),
  },
  clientPrefix: "VITE_",
  client: {
    VITE_APP_TITLE: v.optional(v.string()),
  },
  runtimeEnv: { ...process.env, ...import.meta.env },
});

const parseBool = (s: string | undefined, defaultValue: boolean): boolean => {
  if (s === undefined) return defaultValue;
  return s === "true";
};

export const boolFromEnv = {
  get OPENPORT_AUTH_MOCK(): boolean {
    return parseBool(env.OPENPORT_AUTH_MOCK, false);
  },
  get OPENPORT_SELF_INTROSPECTION(): boolean {
    return parseBool(env.OPENPORT_SELF_INTROSPECTION, true);
  },
};

export { env };
