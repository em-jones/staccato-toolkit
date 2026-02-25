import { defineConfig } from "vite-plus";

export default defineConfig({
	pack: {
		dts: {
			tsgo: true,
		},
		exports: true,
		deps: {
			neverBundle: ["bun:sqlite"],
		},
	},
	lint: {
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	fmt: {},
});
