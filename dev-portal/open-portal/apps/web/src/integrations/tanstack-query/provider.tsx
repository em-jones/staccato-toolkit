import type { QueryClient } from "@tanstack/solid-query";

export function getContext(queryClient: QueryClient) {
  return {
    queryClient,
  };
}
