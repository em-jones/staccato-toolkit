import type { InferOutput } from "valibot";
import { array, literal, nullable, object, union } from "valibot";

const Default = object({
  provider: literal("better-auth"),
  plugins: nullable(array(union([literal("organizations")])), ["organizations"]),
});
const ServerConfig = union([Default]);
export type ServerConfig = InferOutput<typeof ServerConfig>;
export const Config = {
  server: ServerConfig,
  client: nullable(object({}), {}),
};
