import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.locations,
    queryFn: tauriClient.listLocations,
  })
}
