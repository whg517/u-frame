import { describe, expect, it } from "vitest"

import type { RackPlacementViewDto } from "@/shared/lib/tauri-client/bindings"
import { availableRanges, conflictingPlacement } from "./placement-options"

const placement = (assetId: string, startU: number, endU: number): RackPlacementViewDto => ({
  placementId: assetId,
  assetId,
  name: assetId,
  type: "server",
  status: "active",
  hostname: null,
  intranetIp: null,
  serialNumber: null,
  vendor: null,
  model: null,
  purpose: null,
  startU,
  endU,
  heightU: endU - startU + 1,
})

describe("placement options", () => {
  it("returns only continuous ranges that fit the device", () => {
    expect(availableRanges(12, 3, [placement("a", 4, 6), placement("b", 10, 10)]))
      .toEqual([{ startU: 1, endU: 3 }, { startU: 7, endU: 9 }])
  })

  it("excludes the moving asset from occupied units", () => {
    expect(availableRanges(6, 2, [placement("moving", 2, 3)], "moving"))
      .toEqual([{ startU: 1, endU: 6 }])
  })

  it("identifies the conflicting device", () => {
    const existing = placement("existing", 5, 7)
    expect(conflictingPlacement(6, 8, [existing])?.assetId).toBe("existing")
    expect(conflictingPlacement(8, 9, [existing])).toBeNull()
  })
})
