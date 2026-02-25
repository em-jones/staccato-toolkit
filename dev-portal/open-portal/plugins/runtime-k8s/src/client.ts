/**
 * Kubernetes API abstraction for OpenPort.
 * Allows for swappable implementations (real K8s API or mock).
 */

import type { Logger } from "@op/platform/o11y/api";

export interface KubernetesResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp?: string;
    resourceVersion?: string;
  };
  status?: Record<string, unknown>;
  spec?: Record<string, unknown>;
}

export interface ListResourcesOptions {
  namespace?: string;
  labelSelector?: string;
  limit?: number;
}

export interface PodLogOptions {
  namespace: string;
  podName: string;
  container?: string;
  follow?: boolean;
  previous?: boolean;
  tailLines?: number;
}

/**
 * KubernetesClient interface - abstracts all K8s API calls.
 */
export interface KubernetesClient {
  /**
   * List resources of a given kind.
   */
  listResources(kind: string, options?: ListResourcesOptions): Promise<KubernetesResource[]>;

  /**
   * Get a specific resource.
   */
  getResource(kind: string, name: string, namespace?: string): Promise<KubernetesResource>;

  /**
   * Stream pod logs via Server-Sent Events.
   */
  streamPodLogs(options: PodLogOptions): Promise<ReadableStream<Uint8Array>>;
}

/**
 * Factory function to create a Kubernetes client.
 * In production, this would connect to the actual K8s API server.
 * For now, returns a mock client.
 */
export function createKubernetesClient(_config?: { apiUrl?: string; token?: string }, logger?: Logger): KubernetesClient {
  logger?.info("Creating Kubernetes client");
  // Return mock client for now - real implementation would use @kubernetes/client-node
  return createMockKubernetesClient(logger);
}

/**
 * Create a mock Kubernetes client for development and testing.
 */
export function createMockKubernetesClient(logger?: Logger): KubernetesClient {
  const { MockKubernetesClient } = require("./mock");
  logger?.debug("Creating MockKubernetesClient");
  return new MockKubernetesClient();
}

export * from "./mock.ts";
