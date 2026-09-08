import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { PreferencesProvider } from "@/shared/preferences/preferences-provider"

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 5_000 },
          mutations: { retry: false },
        },
      }),
  )

  return (
    <PreferencesProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </PreferencesProvider>
  )
}
