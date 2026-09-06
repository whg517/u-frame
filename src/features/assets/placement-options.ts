import type { RackPlacementViewDto } from "@/shared/lib/tauri-client/bindings"

export interface FreeRange {
  startU: number
  endU: number
}

export function availableRanges(
  totalU: number,
  heightU: number,
  placements: RackPlacementViewDto[],
  excludedAssetId?: string,
): FreeRange[] {
  const occupied = new Set<number>()
  for (const placement of placements) {
    if (placement.assetId === excludedAssetId) continue
    for (let unit = placement.startU; unit <= placement.endU; unit += 1) occupied.add(unit)
  }

  const ranges: FreeRange[] = []
  let start: number | null = null
  for (let unit = 1; unit <= totalU + 1; unit += 1) {
    const isFree = unit <= totalU && !occupied.has(unit)
    if (isFree && start === null) start = unit
    if (!isFree && start !== null) {
      const endU = unit - 1
      if (endU - start + 1 >= heightU) ranges.push({ startU: start, endU })
      start = null
    }
  }
  return ranges
}

export function conflictingPlacement(
  startU: number,
  endU: number,
  placements: RackPlacementViewDto[],
  excludedAssetId?: string,
): RackPlacementViewDto | null {
  return placements.find((placement) =>
    placement.assetId !== excludedAssetId
    && placement.startU <= endU
    && placement.endU >= startU,
  ) ?? null
}
