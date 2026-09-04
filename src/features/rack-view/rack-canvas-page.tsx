import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState, type CSSProperties, type WheelEvent } from "react"
import { Link, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/shared/components/empty-state"
import { errorMessage } from "@/shared/lib/errors"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "@/features/locations/queries"
import { DeviceInspector } from "./device-inspector"
import { CanvasZoomControls } from "./canvas-zoom-controls"
import { CANVAS_ZOOM_STEP, clampCanvasZoom } from "./layout"
import { RackCanvas } from "./rack-canvas"
import "./rack-canvas.css"

export function RackCanvasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [zoom, setZoom] = useState(1)
  const queryClient = useQueryClient()
  const areaId = searchParams.get("area") || null
  const selectedAssetId = searchParams.get("highlight") || null
  const locations = useLocations()
  const view = useQuery({
    queryKey: queryKeys.rackView(areaId),
    queryFn: () => tauriClient.getRackView(areaId),
  })
  const reorder = useMutation({
    mutationFn: (rackIds: string[]) => tauriClient.reorderRacks({ rackIds }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rackView(areaId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.racksRoot }),
      ])
    },
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

  const updateZoom = (delta: number) => {
    setZoom((current) => clampCanvasZoom(current + delta))
  }

  const handleCanvasWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    updateZoom(event.deltaY > 0 ? -CANVAS_ZOOM_STEP : CANVAS_ZOOM_STEP)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b px-5 lg:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="shrink-0 text-lg font-semibold tracking-tight">机柜一览</h1>
          <p className="hidden truncate text-xs text-muted-foreground lg:block">
            正面 U 位 · 顶部为最大 U，底部为 U1
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="sr-only" htmlFor="area-filter">
            区域
          </label>
          <select
            id="area-filter"
            value={areaId ?? ""}
            onChange={(event) => updateArea(event.target.value)}
            className="h-8 min-w-40 rounded-md border border-input bg-background px-2.5 text-sm"
          >
            <option value="">全部区域</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.roomName} / {area.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/racks/new" />}
          >
            <Plus /> 新建机柜
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="rack-canvas-viewport size-full overflow-auto"
            style={{ "--canvas-zoom": zoom } as CSSProperties}
            onWheel={handleCanvasWheel}
          >
            {view.isPending ? (
              <div className="grid size-full place-items-center">
                <p className="text-sm text-muted-foreground">正在绘制机柜…</p>
              </div>
            ) : view.isError ? (
              <div className="grid size-full place-items-center px-6 text-center">
                <p className="text-sm text-destructive">{errorMessage(view.error)}</p>
              </div>
            ) : view.data.racks.length === 0 ? (
              <div className="grid size-full min-h-80 place-items-center">
                <EmptyState
                  variant="canvas"
                  title="当前范围没有机柜"
                  description="创建位置和机柜后，会在这里显示正面 U 位图。"
                  action={
                    <Button nativeButton={false} render={<Link to="/racks/new" />}>
                      <Plus /> 创建机柜
                    </Button>
                  }
                />
              </div>
            ) : (
              <div
                className="rack-zoom-layer"
                style={{
                  zoom,
                  minWidth: `${100 / zoom}%`,
                  minHeight: `${100 / zoom}%`,
                }}
              >
                <RackCanvas
                  key={view.data.racks.map(({ rack }) => rack.id).join(":")}
                  racks={view.data.racks}
                  selectedAssetId={selectedAssetId}
                  isReordering={reorder.isPending}
                  onReorderRacks={(rackIds) => reorder.mutateAsync(rackIds).then(() => undefined)}
                  onSelectAsset={(asset) => {
                    const next = new URLSearchParams(searchParams)
                    next.set("highlight", asset.assetId)
                    setSearchParams(next)
                  }}
                />
              </div>
            )}
          </div>
          {reorder.isError ? (
            <div className="rack-canvas-message" role="alert">
              {errorMessage(reorder.error)}
            </div>
          ) : null}
          <CanvasZoomControls
            zoom={zoom}
            onZoomOut={() => updateZoom(-CANVAS_ZOOM_STEP)}
            onReset={() => setZoom(1)}
            onZoomIn={() => updateZoom(CANVAS_ZOOM_STEP)}
          />
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
