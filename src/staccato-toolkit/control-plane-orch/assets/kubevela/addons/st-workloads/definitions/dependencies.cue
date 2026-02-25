import (
	"encoding/json"
)

"dependencies": {
	description: "Attach component dependency information via st-workloads.component/deps annotation as a JSON array"
	type:        "trait"
}

template: {
	patch: {
		metadata: {
			annotations: {
				"st-workloads.component/deps": json.Marshal(parameter.dependencies)
			}
		}
	}

	parameter: {
		// dependencies is a list of component names that this component depends on.
		// Each string should be a reference to another component in the application.
		// Example: ["database", "cache-service", "auth-provider"]
		dependencies: *[] | [...string]
	}
}
