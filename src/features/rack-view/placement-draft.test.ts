import { describe, expect, it } from "vitest"

import type { RackCanvasDto } from "@/shared/lib/tauri-client/bindings"
import {
  applyPlacementMoves,
  updatePlacementMoves,
  validatePlacementTarget,
} from "./placement-draft"

const racks: RackCanvasDto[] = [
  {
    rack: {
      id: "rack-1", areaId: "area-1", areaName: "A 区", roomId: "room-1",
      roomName: "机房", code: "A-01", specification: "18U", totalU: 18,
      powerCapacityW: null, status: "active", notes: null,
    },
    placements: [
      {
        placementId: "placement-1", assetId: "asset-1", name: "计算节点",
        type: "server", status: "active", hostname: null, intranetIp: null,
        serialNumber: null, vendor: null, model: null, purpose: null,
        startU: 4, endU: 5, heightU: 2,
      },
      {
        placementId: "placement-2", assetId: "asset-2", name: "交换机",
        type: "switch", status: "active", hostname: null, intranetIp: null,
        serialNumber: null, vendor: null, model: null, purpose: null,
        startU: 10, endU: 10, heightU: 1,
      },
    ],
  },
  {
    rack: {
      id: "rack-2", areaId: "area-1", areaName: "A 区", roomId: "room-1",
      roomName: "机房", code: "A-02", specification: "18U", totalU: 18,
      powerCapacityW: null, status: "active", notes: null,
    },
    placements: [],
  },
]

describe("rack placement drafts", () => {
  it("projects a move without mutating the persisted rack view", () => {
    const projected = applyPlacementMoves(racks, [{ assetId: "asset-1", rackId: "rack-2", startU: 7 }])

    expect(projected[0].placements.map((item) => item.assetId)).toEqual(["asset-2"])
    expect(projected[1].placements[0]).toMatchObject({ assetId: "asset-1", startU: 7, endU: 8 })
    expect(racks[0].placements[0].startU).toBe(4)
  })

  it("removes a draft when the device returns to its original position", () => {
    const moved = updatePlacementMoves(racks, [], { assetId: "asset-1", rackId: "rack-2", startU: 7 })
    const restored = updatePlacementMoves(racks, moved, { assetId: "asset-1", rackId: "rack-1", startU: 4 })

    expect(restored).toEqual([])
  })

  it("reports overlap against the projected layout", () => {
    expect(validatePlacementTarget(racks, "asset-1", "rack-1", 9, 2)).toEqual({
      endU: 10,
      valid: false,
      message: "与 交换机（U10–U10）冲突",
    })
    expect(validatePlacementTarget(racks, "asset-1", "rack-2", 17, 2).valid).toBe(true)
  })
})
