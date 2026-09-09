import { QueryClient } from "@tanstack/react-query"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // IPC reads and writes reach local SQLite even when the Mac is offline.
      queries: { networkMode: "always", retry: false, staleTime: 5_000 },
      mutations: { networkMode: "always", retry: false },
    },
  })
}
