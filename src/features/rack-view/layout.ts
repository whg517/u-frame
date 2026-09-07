export const U_HEIGHT = 13
export const MIN_CANVAS_ZOOM = 0.5
export const MAX_CANVAS_ZOOM = 1.6
export const CANVAS_ZOOM_STEP = 0.1

export function placementGeometry(startU: number, heightU: number) {
  return {
    bottom: (startU - 1) * U_HEIGHT,
    height: heightU * U_HEIGHT,
  }
}

export function deviceGrabOffset(
  clientY: number,
  top: number,
  height: number,
  heightU: number,
) {
  if (height <= 0 || heightU <= 1) return 0
  const unitHeight = height / heightU
  const offset = Math.floor((top + height - clientY) / unitHeight)
  return Math.min(heightU - 1, Math.max(0, offset))
}

export function droppedDeviceStartU(
  clientY: number,
  rackTop: number,
  rackHeight: number,
  totalU: number,
  heightU: number,
  grabOffsetU: number,
) {
  if (rackHeight <= 0 || totalU <= 0) return 1
  const unitHeight = rackHeight / totalU
  const pointerU = Math.floor((rackTop + rackHeight - clientY) / unitHeight) + 1
  const highestStart = Math.max(1, totalU - heightU + 1)
  return Math.min(highestStart, Math.max(1, pointerU - grabOffsetU))
}

export function clampCanvasZoom(zoom: number) {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, Number(zoom.toFixed(1))))
}

export function reorderRackIds(
  rackIds: string[],
  draggedId: string,
  targetId: string,
  position: "before" | "after",
) {
  if (draggedId === targetId || !rackIds.includes(draggedId) || !rackIds.includes(targetId)) {
    return rackIds
  }

  const next = rackIds.filter((rackId) => rackId !== draggedId)
  const targetIndex = next.indexOf(targetId)
  next.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, draggedId)
  return next
}
