import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/shared/components/empty-state"
import { PageHeader } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "@/features/locations/queries"
import { DeviceInspector } from "./device-inspector"
import { RackCanvas } from "./rack-canvas"

export function RackCanvasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const areaId = searchParams.get("area") || null
  const selectedAssetId = searchParams.get("highlight") || null
  const locations = useLocations()
  const view = useQuery({
    queryKey: queryKeys.rackView(areaId),
    queryFn: () => tauriClient.getRackView(areaId),
  })
  const areas = locations.data?.rooms.flatMap(({ room, areas }) =>
    areas.map((area) => ({ ...area, roomName: room.name })),
  ) ?? []
  const selection = (() => {
    for (const rack of view.data?.racks ?? []) {
      const placement = rack.placements.find((item) => item.assetId === selectedAssetId)
      if (placement) return { placement, rack: rack.rack }
    }
    return null
  })()

  const updateArea = (nextAreaId: string) => {
    const next = new URLSearchParams(searchParams)
    if (nextAreaId) next.set("area", nextAreaId)
    else next.delete("area")
    next.delete("highlight")
    setSearchParams(next)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Rack canvas"
        title="机柜一览"
        description="正面 U 位视图 · 顶部为最大 U，底部为 U1"
        actions={
          <>
            <label className="sr-only" htmlFor="area-filter">区域</label>
            <select id="area-filter" value={areaId ?? ""} onChange={(event) => updateArea(event.target.value)} className="h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              <option value="">全部区域</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.roomName} / {area.name}</option>)}
            </select>
            <Button variant="outline" nativeButton={false} render={<Link to="/racks/new" />}><Plus /> 新建机柜</Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          {view.isPending ? (
            <p className="p-8 text-sm text-muted-foreground">正在绘制机柜…</p>
          ) : view.isError ? (
            <p className="p-8 text-sm text-destructive">{errorMessage(view.error)}</p>
          ) : view.data.racks.length === 0 ? (
            <div className="p-8">
              <EmptyState title="当前范围没有机柜" description="创建位置和机柜后，会在这里显示正面 U 位图。" action={<Button nativeButton={false} render={<Link to="/racks/new" />}><Plus /> 创建机柜</Button>} />
            </div>
          ) : (
            <RackCanvas
              racks={view.data.racks}
              selectedAssetId={selectedAssetId}
              onSelectAsset={(asset) => {
                const next = new URLSearchParams(searchParams)
                next.set("highlight", asset.assetId)
                setSearchParams(next)
              }}
            />
          )}
        </div>
        {selection ? (
          <DeviceInspector
            placement={selection.placement}
            rack={selection.rack}
            onClose={() => {
              const next = new URLSearchParams(searchParams)
              next.delete("highlight")
              setSearchParams(next)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
