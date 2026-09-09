import { QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { PreferencesProvider } from "@/shared/preferences/preferences-provider"
import { createQueryClient } from "./query-client"

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <PreferencesProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </PreferencesProvider>
  )
}
