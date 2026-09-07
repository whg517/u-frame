import type {
  AssetPlacementMoveInput,
  RackCanvasDto,
} from "@/shared/lib/tauri-client/bindings"

export type PlacementTarget = {
  endU: number
  valid: boolean
  message: string | null
}

export function applyPlacementMoves(
  racks: RackCanvasDto[],
  moves: AssetPlacementMoveInput[],
): RackCanvasDto[] {
  const moveByAsset = new Map(moves.map((move) => [move.assetId, move]))
  const projected = racks.map(({ rack }) => ({ rack, placements: [] as RackCanvasDto["placements"] }))
  const rackById = new Map(projected.map((rack) => [rack.rack.id, rack]))

  for (const source of racks) {
    for (const placement of source.placements) {
      const move = moveByAsset.get(placement.assetId)
      const target = rackById.get(move?.rackId ?? source.rack.id)
      if (!target) continue
      const startU = move?.startU ?? placement.startU
      target.placements.push({
        ...placement,
        startU,
        endU: startU + placement.heightU - 1,
      })
    }
  }

  for (const rack of projected) {
    rack.placements.sort((left, right) => left.startU - right.startU)
  }
  return projected
}

export function updatePlacementMoves(
  originalRacks: RackCanvasDto[],
  moves: AssetPlacementMoveInput[],
  nextMove: AssetPlacementMoveInput,
) {
  const original = originalRacks
    .flatMap(({ rack, placements }) => placements.map((placement) => ({ rackId: rack.id, placement })))
    .find(({ placement }) => placement.assetId === nextMove.assetId)
  if (!original) return moves

  const remaining = moves.filter((move) => move.assetId !== nextMove.assetId)
  if (original.rackId === nextMove.rackId && original.placement.startU === nextMove.startU) {
    return remaining
  }
  return [...remaining, nextMove]
}

export function validatePlacementTarget(
  racks: RackCanvasDto[],
  assetId: string,
  rackId: string,
  startU: number,
  heightU: number,
): PlacementTarget {
  const rack = racks.find((item) => item.rack.id === rackId)
  const endU = startU + heightU - 1
  if (!rack || startU < 1 || endU > rack.rack.totalU) {
    return { endU, valid: false, message: "目标位置超出机柜范围" }
  }
  const conflict = rack.placements.find((placement) => (
    placement.assetId !== assetId
    && startU <= placement.endU
    && endU >= placement.startU
  ))
  if (conflict) {
    return {
      endU,
      valid: false,
      message: `与 ${conflict.name}（U${conflict.startU}–U${conflict.endU}）冲突`,
    }
  }
  return { endU, valid: true, message: null }
}
