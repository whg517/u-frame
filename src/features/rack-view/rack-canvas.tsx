import { GripVertical } from "lucide-react"
import {
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from "react"

import type { RackCanvasDto, RackPlacementViewDto } from "@/shared/lib/tauri-client/bindings"
import {
  U_HEIGHT,
  deviceGrabOffset,
  droppedDeviceStartU,
  placementGeometry,
  reorderRackIds,
} from "./layout"
import { validatePlacementTarget } from "./placement-draft"
import "./rack-canvas.css"

export function RackCanvas({
  racks,
  selectedAssetId,
  onSelectAsset,
  onReorderRacks,
  onMoveAsset,
  onEditStart,
  draftAssetIds,
  isLayoutEditing,
  isLayoutSaving,
  isReordering,
}: {
  racks: RackCanvasDto[]
  selectedAssetId: string | null
  onSelectAsset: (asset: RackPlacementViewDto) => void
  onReorderRacks: (rackIds: string[]) => Promise<void>
  onMoveAsset: (move: { assetId: string; rackId: string; startU: number }) => void
  onEditStart: () => void
  draftAssetIds: string[]
  isLayoutEditing: boolean
  isLayoutSaving: boolean
  isReordering: boolean
}) {
  const rackIds = useMemo(() => racks.map(({ rack }) => rack.id), [racks])
  const [orderedRackIds, setOrderedRackIds] = useState(rackIds)
  const [draggedRackId, setDraggedRackId] = useState<string | null>(null)
  const [draggedAsset, setDraggedAsset] = useState<{
    placement: RackPlacementViewDto
    grabOffsetU: number
  } | null>(null)
  const [deviceDropTarget, setDeviceDropTarget] = useState<{
    rackId: string
    startU: number
    endU: number
    valid: boolean
    message: string | null
  } | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    rackId: string
    position: "before" | "after"
  } | null>(null)
  const racksById = useMemo(
    () => new Map(racks.map((rack) => [rack.rack.id, rack])),
    [racks],
  )
  const draftAssetIdSet = useMemo(() => new Set(draftAssetIds), [draftAssetIds])

  const commitOrder = async (nextOrder: string[]) => {
    if (
      nextOrder === orderedRackIds ||
      nextOrder.every((rackId, index) => rackId === orderedRackIds[index])
    ) {
      return
    }
    const previousOrder = orderedRackIds
    setOrderedRackIds(nextOrder)
    try {
      await onReorderRacks(nextOrder)
    } catch {
      setOrderedRackIds(previousOrder)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLElement>, rackId: string) => {
    if (!draggedRackId || draggedRackId === rackId || isReordering) return
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const position = event.clientX < bounds.left + bounds.width / 2 ? "before" : "after"
    event.dataTransfer.dropEffect = "move"
    setDropTarget({ rackId, position })
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (!draggedRackId || !dropTarget) return
    const nextOrder = reorderRackIds(
      orderedRackIds,
      draggedRackId,
      dropTarget.rackId,
      dropTarget.position,
    )
    setDraggedRackId(null)
    setDropTarget(null)
    void commitOrder(nextOrder)
  }

  const handleKeyboardReorder = (event: KeyboardEvent<HTMLButtonElement>, rackId: string) => {
    const index = orderedRackIds.indexOf(rackId)
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault()
      void commitOrder(reorderRackIds(orderedRackIds, rackId, orderedRackIds[index - 1], "before"))
    }
    if (event.key === "ArrowRight" && index < orderedRackIds.length - 1) {
      event.preventDefault()
      void commitOrder(reorderRackIds(orderedRackIds, rackId, orderedRackIds[index + 1], "after"))
    }
  }

  const handleDeviceDragOver = (event: DragEvent<HTMLDivElement>, rack: RackCanvasDto) => {
    if (!draggedAsset || isLayoutSaving) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = event.currentTarget.getBoundingClientRect()
    const startU = droppedDeviceStartU(
      event.clientY,
      bounds.top,
      bounds.height,
      rack.rack.totalU,
      draggedAsset.placement.heightU,
      draggedAsset.grabOffsetU,
    )
    const target = validatePlacementTarget(
      racks,
      draggedAsset.placement.assetId,
      rack.rack.id,
      startU,
      draggedAsset.placement.heightU,
    )
    event.dataTransfer.dropEffect = target.valid ? "move" : "none"
    setDeviceDropTarget({
      rackId: rack.rack.id,
      startU,
      endU: target.endU,
      valid: target.valid,
      message: target.message,
    })
  }

  const handleDeviceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggedAsset || !deviceDropTarget) return
    event.preventDefault()
    event.stopPropagation()
    if (deviceDropTarget.valid) {
      onMoveAsset({
        assetId: draggedAsset.placement.assetId,
        rackId: deviceDropTarget.rackId,
        startU: deviceDropTarget.startU,
      })
    }
    setDeviceDropTarget(null)
  }

  return (
    <div
      className="rack-stage flex min-h-full min-w-max items-center p-6 lg:p-8"
      aria-label="机柜画布"
    >
      <div className="flex items-end gap-12">
        {orderedRackIds.map((rackId) => {
          const rackCanvas = racksById.get(rackId)
          if (!rackCanvas) return null
          const { rack, placements } = rackCanvas
          return (
            <section
              className="rack-frame"
              key={rack.id}
              aria-label={`${rack.code}，${rack.totalU}U`}
              data-dragging={draggedRackId === rack.id}
              data-drop-position={dropTarget?.rackId === rack.id ? dropTarget.position : undefined}
              onDragOver={(event) => handleDragOver(event, rack.id)}
              onDrop={handleDrop}
            >
              <header className="rack-title-wrap">
                <button
                  type="button"
                  className="rack-drag-handle"
                  draggable={!isReordering && !isLayoutEditing}
                  disabled={isReordering || isLayoutEditing}
                  aria-label={`调整机柜 ${rack.code} 的顺序`}
                  title="拖动调整顺序；也可使用左右方向键"
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", rack.id)
                    setDraggedRackId(rack.id)
                  }}
                  onDragEnd={() => {
                    setDraggedRackId(null)
                    setDropTarget(null)
                  }}
                  onKeyDown={(event) => handleKeyboardReorder(event, rack.id)}
                >
                  <GripVertical aria-hidden="true" />
                  <span>
                    <span className="block font-mono text-sm font-semibold">{rack.code}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {rack.roomName} / {rack.areaName}
                    </span>
                  </span>
                </button>
              </header>
              <div className="rack-cap" aria-hidden="true" />
              <div
                className="rack-body"
                data-device-drop={deviceDropTarget?.rackId === rack.id ? (deviceDropTarget.valid ? "valid" : "invalid") : undefined}
                style={{ height: rack.totalU * U_HEIGHT }}
                onDragOver={(event) => handleDeviceDragOver(event, rackCanvas)}
                onDrop={handleDeviceDrop}
              >
                <div className="rack-grid" aria-hidden="true" />
                {Array.from({ length: rack.totalU }, (_, index) => index + 1).map((unit) => (
                  <span
                    className="rack-unit-label"
                    key={unit}
                    style={{ bottom: (unit - 1) * U_HEIGHT }}
                    aria-hidden="true"
                  >
                    {unit}
                  </span>
                ))}
                {placements.map((placement) => {
                  const geometry = placementGeometry(placement.startU, placement.heightU)
                  return (
                    <button
                      type="button"
                      className="rack-device"
                      draggable={!isLayoutSaving}
                      data-draft={draftAssetIdSet.has(placement.assetId)}
                      data-dragging={draggedAsset?.placement.assetId === placement.assetId}
                      data-selected={placement.assetId === selectedAssetId}
                      key={placement.placementId}
                      style={{ bottom: geometry.bottom, height: geometry.height } as CSSProperties}
                      title={`${placement.name} · U${placement.startU}–U${placement.endU}`}
                      aria-label={`${placement.name}，U${placement.startU} 到 U${placement.endU}`}
                      onClick={() => onSelectAsset(placement)}
                      onDragStart={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect()
                        event.dataTransfer.effectAllowed = "move"
                        event.dataTransfer.setData("application/x-uframe-asset", placement.assetId)
                        setDraggedAsset({
                          placement,
                          grabOffsetU: deviceGrabOffset(
                            event.clientY,
                            bounds.top,
                            bounds.height,
                            placement.heightU,
                          ),
                        })
                        onEditStart()
                      }}
                      onDragEnd={() => {
                        setDraggedAsset(null)
                        setDeviceDropTarget(null)
                      }}
                    >
                      <span className="rack-device-handle" aria-hidden="true" />
                      <span className="rack-device-label">{placement.name}</span>
                      <span className="rack-device-handle" aria-hidden="true" />
                    </button>
                  )
                })}
                {deviceDropTarget?.rackId === rack.id && draggedAsset ? (
                  <div
                    className="rack-device-drop-preview"
                    data-valid={deviceDropTarget.valid}
                    style={placementGeometry(deviceDropTarget.startU, draggedAsset.placement.heightU) as CSSProperties}
                    aria-hidden="true"
                  >
                    <span>U{deviceDropTarget.startU}–U{deviceDropTarget.endU}</span>
                    {deviceDropTarget.message ? (
                      <span className="rack-device-drop-tooltip">{deviceDropTarget.message}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rack-foot" aria-hidden="true" />
            </section>
          )
        })}
      </div>
    </div>
  )
}
