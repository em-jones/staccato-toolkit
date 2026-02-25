import { init } from "@op/platform";
import { definePlugin } from "nitro";

// Default validators — extend via module augmentation or replace in production.

const openPort = await init();
//
await openPort.start();

/**
 * Graceful shutdown — call from SIGTERM / Nitro shutdown hook.
 */
export default definePlugin((nitroApp) => {
	// nitroApp.hooks.hook("request", (req) => {
	// 	console.log("Received request:");
	// });
});
