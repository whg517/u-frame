import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"

export function useRacks(areaId: string | null = null) {
  return useQuery({
    queryKey: queryKeys.racks(areaId),
    queryFn: () => tauriClient.listRacks(areaId),
  })
}
