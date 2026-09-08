import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PencilRuler, Plus, Save, X } from "lucide-react"
import { useMemo, useState, type CSSProperties, type WheelEvent } from "react"
import { Link, useLocation, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { workspaceHeaderHeightClass } from "@/shared/components/page"
import { EmptyState } from "@/shared/components/empty-state"
import { t } from "@/shared/i18n/i18n"
import { errorMessage } from "@/shared/lib/errors"
import { queryKeys } from "@/shared/lib/query-keys"
import type { AssetPlacementMoveInput } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { currentRoute, routeWithParams } from "@/shared/lib/navigation-context"
import { usePreferences } from "@/shared/preferences/preferences-provider"
import { useLocations } from "@/features/locations/queries"
import { DeviceInspector } from "./device-inspector"
import { CanvasZoomControls } from "./canvas-zoom-controls"
import { CANVAS_ZOOM_STEP, clampCanvasZoom } from "./layout"
import { filterRackCanvases, replaceFilterValues } from "./filters"
import { MultiSelectFilter } from "./multi-select-filter"
import { applyPlacementMoves, updatePlacementMoves } from "./placement-draft"
import { RackCanvas } from "./rack-canvas"
import "./rack-canvas.css"

export function RackCanvasPage() {
  const { preferences } = usePreferences()
  const [searchParams, setSearchParams] = useSearchParams()
  const [zoom, setZoom] = useState<number>(() => preferences.defaultCanvasZoom)
  const [openFilter, setOpenFilter] = useState<"room" | "area" | null>(null)
  const [isLayoutEditing, setIsLayoutEditing] = useState(false)
  const [draftMoves, setDraftMoves] = useState<AssetPlacementMoveInput[]>([])
  const location = useLocation()
  const queryClient = useQueryClient()
  const roomIds = searchParams.getAll("room")
  const areaIds = searchParams.getAll("area")
  const selectedAssetId = searchParams.get("highlight") || null
  const locations = useLocations()
  const view = useQuery({
    queryKey: queryKeys.rackView(null),
    queryFn: () => tauriClient.getRackView(),
  })
  const reorder = useMutation({
    mutationFn: (rackIds: string[]) => tauriClient.reorderRacks({ rackIds }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.racksRoot }),
      ])
    },
  })
  const saveLayout = useMutation({
    mutationFn: () => tauriClient.moveAssets({ moves: draftMoves }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      setDraftMoves([])
      setIsLayoutEditing(false)
    },
  })
  const rooms = locations.data?.rooms.map(({ room }) => room) ?? []
  const areas = locations.data?.rooms.flatMap(({ room, areas }) => areas.map((area) => ({
    ...area,
    roomName: room.name,
    roomCode: room.code,
  }))) ?? []
  const visibleAreas = roomIds.length === 0
    ? areas
    : areas.filter((area) => roomIds.includes(area.roomId))
  const projectedRacks = useMemo(
    () => applyPlacementMoves(view.data?.racks ?? [], draftMoves),
    [draftMoves, view.data?.racks],
  )
  const visibleRacks = filterRackCanvases(projectedRacks, roomIds, areaIds)
  const origin = currentRoute(location.pathname, location.search)
  const contextualAreaId = areaIds.length === 1
    ? areaIds[0]
    : visibleAreas.length === 1
      ? visibleAreas[0].id
      : null
  const createRackPath = routeWithParams("/racks/new", {
    areaId: contextualAreaId,
    returnTo: origin,
  })
  const selection = (() => {
    for (const rack of visibleRacks) {
      const placement = rack.placements.find((item) => item.assetId === selectedAssetId)
      if (placement) return { placement, rack: rack.rack }
    }
    return null
  })()

  const updateRooms = (nextRoomIds: string[]) => {
    let next = replaceFilterValues(searchParams, "room", nextRoomIds)
    if (nextRoomIds.length > 0) {
      const allowedAreaIds = new Set(areas
        .filter((area) => nextRoomIds.includes(area.roomId))
        .map((area) => area.id))
      const retainedAreaIds = areaIds.filter((areaId) => allowedAreaIds.has(areaId))
      next = replaceFilterValues(next, "area", retainedAreaIds)
    }
    setSearchParams(next)
  }

  const updateAreas = (nextAreaIds: string[]) => {
    setSearchParams(replaceFilterValues(searchParams, "area", nextAreaIds))
  }

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete("room")
    next.delete("area")
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

  const beginLayoutEdit = () => {
    if (isLayoutEditing) return
    setIsLayoutEditing(true)
    setOpenFilter(null)
    const next = new URLSearchParams(searchParams)
    next.delete("highlight")
    setSearchParams(next, { replace: true })
  }

  const cancelLayoutEdit = () => {
    setDraftMoves([])
    setIsLayoutEditing(false)
    saveLayout.reset()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className={`${workspaceHeaderHeightClass} flex shrink-0 items-center justify-between gap-6 border-b px-5 lg:px-6`}>
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="shrink-0 text-lg font-semibold tracking-tight">{t("机柜一览")}</h1>
          <p className="hidden truncate text-xs text-muted-foreground lg:block">
            {isLayoutEditing
              ? t("布局编辑中 · {status}", { status: draftMoves.length > 0 ? t("已调整 {count} 台设备", { count: draftMoves.length }) : t("拖动设备调整位置") })
              : t("正面 U 位 · 顶部为最大 U，底部为 U1")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MultiSelectFilter
            label={t("机房")}
            allLabel={t("全部机房")}
            options={rooms.map((room) => ({ value: room.id, label: room.name, description: room.code }))}
            values={roomIds}
            onChange={updateRooms}
            disabled={locations.isPending || locations.isError || isLayoutEditing}
            open={openFilter === "room"}
            onOpenChange={(open) => setOpenFilter(open ? "room" : null)}
          />
          <MultiSelectFilter
            label={t("区域")}
            allLabel={t("全部区域")}
            options={visibleAreas.map((area) => ({ value: area.id, label: area.name, description: `${area.roomName} · ${area.code}` }))}
            values={areaIds}
            onChange={updateAreas}
            disabled={locations.isPending || locations.isError || isLayoutEditing}
            open={openFilter === "area"}
            onOpenChange={(open) => setOpenFilter(open ? "area" : null)}
          />
          {isLayoutEditing ? (
            <>
              <Button variant="outline" size="sm" disabled={saveLayout.isPending} onClick={cancelLayoutEdit}>
                <X /> {t("取消")}
              </Button>
              <Button size="sm" disabled={draftMoves.length === 0 || saveLayout.isPending} onClick={() => saveLayout.mutate()}>
                <Save /> {saveLayout.isPending ? t("正在保存…") : t("保存调整")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={beginLayoutEdit}>
                <PencilRuler /> {t("编辑布局")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to={createRackPath} />}
              >
                <Plus /> {t("新建机柜")}
              </Button>
            </>
          )}
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
                <p className="text-sm text-muted-foreground">{t("正在绘制机柜…")}</p>
              </div>
            ) : view.isError ? (
              <div className="grid size-full place-items-center px-6 text-center">
                <p className="text-sm text-destructive">{errorMessage(view.error)}</p>
              </div>
            ) : visibleRacks.length === 0 ? (
              <div className="grid size-full min-h-80 place-items-center">
                <EmptyState
                  variant="canvas"
                  title={roomIds.length > 0 || areaIds.length > 0 ? t("筛选范围没有机柜") : t("当前范围没有机柜")}
                  description={roomIds.length > 0 || areaIds.length > 0 ? t("可以调整机房或区域筛选条件。") : t("创建位置和机柜后，会在这里显示正面 U 位图。")}
                  action={
                    roomIds.length > 0 || areaIds.length > 0
                      ? <Button variant="outline" onClick={clearFilters}>{t("查看全部")}</Button>
                      : <Button nativeButton={false} render={<Link to={createRackPath} />}><Plus /> {t("创建机柜")}</Button>
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
                  key={visibleRacks.map(({ rack }) => rack.id).join(":")}
                  racks={visibleRacks}
                  selectedAssetId={selectedAssetId}
                  isReordering={reorder.isPending}
                  isLayoutEditing={isLayoutEditing}
                  isLayoutSaving={saveLayout.isPending}
                  draftAssetIds={draftMoves.map((move) => move.assetId)}
                  onEditStart={beginLayoutEdit}
                  onMoveAsset={(move) => {
                    setDraftMoves((current) => updatePlacementMoves(view.data?.racks ?? [], current, move))
                  }}
                  onReorderRacks={(rackIds) => reorder.mutateAsync(rackIds).then(() => undefined)}
                  onSelectAsset={(asset) => {
                    if (isLayoutEditing) return
                    const next = new URLSearchParams(searchParams)
                    next.set("highlight", asset.assetId)
                    setSearchParams(next)
                  }}
                />
              </div>
            )}
          </div>
          {reorder.isError || saveLayout.isError ? (
            <div className="rack-canvas-message" role="alert">
              {errorMessage(reorder.error ?? saveLayout.error)}
            </div>
          ) : null}
          <CanvasZoomControls
            zoom={zoom}
            defaultZoom={preferences.defaultCanvasZoom}
            onZoomOut={() => updateZoom(-CANVAS_ZOOM_STEP)}
            onReset={() => setZoom(preferences.defaultCanvasZoom)}
            onZoomIn={() => updateZoom(CANVAS_ZOOM_STEP)}
          />
        </div>
        {selection && !isLayoutEditing ? (
          <DeviceInspector
            placement={selection.placement}
            rack={selection.rack}
            returnTo={origin}
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
