import type { RackCanvasDto } from "@/shared/lib/tauri-client/bindings"

export function filterRackCanvases(
  racks: RackCanvasDto[],
  roomIds: string[],
  areaIds: string[],
) {
  const rooms = new Set(roomIds)
  const areas = new Set(areaIds)
  return racks.filter(({ rack }) =>
    (rooms.size === 0 || rooms.has(rack.roomId))
    && (areas.size === 0 || areas.has(rack.areaId)),
  )
}

export function replaceFilterValues(
  params: URLSearchParams,
  key: "room" | "area",
  values: string[],
) {
  const next = new URLSearchParams(params)
  next.delete(key)
  for (const value of values) next.append(key, value)
  next.delete("highlight")
  return next
}
