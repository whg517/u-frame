import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { RackCanvasDto } from "@/shared/lib/tauri-client/bindings"
import { RackCanvas } from "./rack-canvas"

const racks: RackCanvasDto[] = [
  {
    rack: {
      id: "rack-1", areaId: "area-1", areaName: "A 区", roomId: "room-1",
      roomName: "机房", code: "A-01", specification: "42U", totalU: 42,
      powerCapacityW: null, status: "active", notes: null,
    },
    placements: [
      {
        placementId: "placement-1", assetId: "asset-1", name: "计算节点",
        type: "server", status: "active", hostname: "node-1", intranetIp: null,
        serialNumber: null, vendor: null, model: null, purpose: null,
        startU: 19, endU: 22, heightU: 4,
      },
    ],
  },
]

describe("RackCanvas", () => {
  it("renders continuous U labels from U1 to the rack maximum", () => {
    render(<RackCanvas racks={racks} selectedAssetId={null} onSelectAsset={() => undefined} />)
    expect(screen.getByLabelText("A-01，42U")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("returns the selected placement", () => {
    const onSelect = vi.fn()
    render(<RackCanvas racks={racks} selectedAssetId={null} onSelectAsset={onSelect} />)
    fireEvent.click(screen.getByRole("button", { name: "计算节点，U19 到 U22" }))
    expect(onSelect).toHaveBeenCalledWith(racks[0].placements[0])
  })
})
