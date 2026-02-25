import type {
  KubernetesClient,
  KubernetesResource,
  ListResourcesOptions,
  PodLogOptions,
} from "./client.ts";
import type { Logger } from "@op/platform/o11y/api";

/**
 * MockKubernetesClient - reads from static JSON fixture files.
 * Used for local development without a real Kubernetes cluster.
 */
export class MockKubernetesClient implements KubernetesClient {
  private fixtures: Map<string, KubernetesResource[]> = new Map();
  private logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
    this.logger?.debug("Initializing MockKubernetesClient");

    // Initialize with mock fixture data
    this.fixtures.set("Deployment", [
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          name: "example-app",
          namespace: "default",
          labels: {
            app: "example-app",
            "staccato.io/catalog-entity": "example-app",
            "staccato.io/catalog-kind": "Component",
          },
        },
        spec: {
          replicas: 3,
          selector: {
            matchLabels: {
              app: "example-app",
            },
          },
        },
        status: {
          replicas: 3,
          updatedReplicas: 3,
          readyReplicas: 3,
        },
      },
    ]);

    this.fixtures.set("Service", [
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          name: "example-app-svc",
          namespace: "default",
        },
        spec: {
          type: "ClusterIP",
          ports: [
            {
              port: 80,
              targetPort: 8080,
            },
          ],
        },
      },
    ]);

    this.fixtures.set("Pod", [
      {
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name: "example-app-pod-1",
          namespace: "default",
          labels: {
            app: "example-app",
          },
        },
        status: {
          phase: "Running",
          containerStatuses: [
            {
              name: "app",
              ready: true,
              restartCount: 0,
            },
          ],
        },
      },
    ]);

    this.logger?.debug("MockKubernetesClient initialized with fixtures", {
      fixtureKinds: Array.from(this.fixtures.keys()),
    });
  }

  async listResources(kind: string, options?: ListResourcesOptions): Promise<KubernetesResource[]> {
    this.logger?.debug("Listing Kubernetes resources", { kind, namespace: options?.namespace, labelSelector: options?.labelSelector });
    const resources = this.fixtures.get(kind) || [];

    let filtered = resources;
    if (options?.namespace) {
      filtered = filtered.filter((r) => r.metadata.namespace === options.namespace);
    }

    if (options?.labelSelector) {
      // Simple label selector matching
      filtered = filtered.filter((r) => {
        if (!r.metadata.labels) return false;
        const [key, value] = options.labelSelector!.split("=");
        return r.metadata.labels[key] === value;
      });
    }

    this.logger?.debug(`Found ${filtered.length} ${kind} resource(s)`);
    return filtered;
  }

  async getResource(kind: string, name: string, namespace?: string): Promise<KubernetesResource> {
    this.logger?.debug("Getting Kubernetes resource", { kind, name, namespace });
    const resources = this.fixtures.get(kind) || [];
    const resource = resources.find(
      (r) => r.metadata.name === name && (!namespace || r.metadata.namespace === namespace),
    );

    if (!resource) {
      this.logger?.warn(`Kubernetes resource not found: ${kind} "${namespace || "default"}/${name}"`);
      throw new Error(`${kind} "${namespace}/${name}" not found in mock fixtures`);
    }

    return resource;
  }

  async streamPodLogs(options: PodLogOptions): Promise<ReadableStream<Uint8Array>> {
    this.logger?.debug("Streaming pod logs", {
      namespace: options.namespace,
      podName: options.podName,
      container: options.container,
    });

    // Return a mock log stream
    const mockLogs = "Mock log line 1\nMock log line 2\nMock log line 3\n";

    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(mockLogs));
        controller.close();
      },
    });
  }
}

/**
 * Create and return a KubernetesClient based on the OPENPORT_K8S_MOCK env var.
 */
export function createKubernetesClient(logger?: Logger): KubernetesClient {
  const useMock = process.env.OPENPORT_K8S_MOCK !== "false";

  if (useMock) {
    logger?.info("Creating MockKubernetesClient (OPENPORT_K8S_MOCK=true)");
    return new MockKubernetesClient(logger);
  }

  // In production, would instantiate real K8s client here
  logger?.error("Real Kubernetes client not implemented");
  throw new Error(
    "Real Kubernetes client not implemented; set OPENPORT_K8S_MOCK=true for local development",
  );
}
