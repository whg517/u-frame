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
