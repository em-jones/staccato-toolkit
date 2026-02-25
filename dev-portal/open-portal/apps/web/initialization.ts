// instrumentation.ts - Initialize before your app

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import Conventions from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
	resource: resourceFromAttributes({
		[Conventions.ATTR_SERVICE_NAME]: "openportal",
		[Conventions.ATTR_SERVICE_VERSION]:
			process.env.npm_package_version || "0.0.1",
	}),
	instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize BEFORE importing your app
sdk.start();
