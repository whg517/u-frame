import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"

export function useAssets() {
  return useQuery({ queryKey: queryKeys.assets, queryFn: tauriClient.listAssets })
}
