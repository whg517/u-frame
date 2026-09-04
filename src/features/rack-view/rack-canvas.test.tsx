import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
  {
    rack: {
      id: "rack-2", areaId: "area-1", areaName: "A 区", roomId: "room-1",
      roomName: "机房", code: "A-02", specification: "27U", totalU: 27,
      powerCapacityW: null, status: "active", notes: null,
    },
    placements: [],
  },
]

function renderCanvas(overrides?: {
  onSelectAsset?: (asset: RackCanvasDto["placements"][number]) => void
  onReorderRacks?: (rackIds: string[]) => Promise<void>
}) {
  return render(
    <RackCanvas
      racks={racks}
      selectedAssetId={null}
      isReordering={false}
      onSelectAsset={overrides?.onSelectAsset ?? vi.fn()}
      onReorderRacks={overrides?.onReorderRacks ?? vi.fn().mockResolvedValue(undefined)}
    />,
  )
}

describe("RackCanvas", () => {
  it("renders continuous U labels from U1 to the rack maximum", () => {
    renderCanvas()
    const rack = screen.getByLabelText("A-01，42U")
    expect(rack).toBeInTheDocument()
    expect(within(rack).getByText("42")).toBeInTheDocument()
    expect(within(rack).getByText("1")).toBeInTheDocument()
  })

  it("returns the selected placement", () => {
    const onSelect = vi.fn()
    renderCanvas({ onSelectAsset: onSelect })
    fireEvent.click(screen.getByRole("button", { name: "计算节点，U19 到 U22" }))
    expect(onSelect).toHaveBeenCalledWith(racks[0].placements[0])
  })

  it("persists keyboard reordering and updates the visible order", async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined)
    renderCanvas({ onReorderRacks: onReorder })

    fireEvent.keyDown(screen.getByRole("button", { name: "调整机柜 A-01 的顺序" }), {
      key: "ArrowRight",
    })

    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(["rack-2", "rack-1"]))
    const frames = screen.getAllByRole("region")
    expect(frames.map((frame) => frame.getAttribute("aria-label"))).toEqual([
      "A-02，27U",
      "A-01，42U",
    ])
  })

  it("persists a drag and drop reorder", async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined)
    renderCanvas({ onReorderRacks: onReorder })
    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      setData: vi.fn(),
    }

    fireEvent.dragStart(screen.getByRole("button", { name: "调整机柜 A-01 的顺序" }), {
      dataTransfer,
    })
    const secondRack = screen.getByRole("region", { name: "A-02，27U" })
    fireEvent.dragOver(secondRack, { clientX: 10, dataTransfer })
    expect(secondRack).toHaveAttribute("data-drop-position", "after")
    fireEvent.drop(secondRack, { dataTransfer })

    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(["rack-2", "rack-1"]))
  })

  it("rolls back an optimistic order when persistence fails", async () => {
    const onReorder = vi.fn().mockRejectedValue(new Error("failed"))
    renderCanvas({ onReorderRacks: onReorder })

    fireEvent.keyDown(screen.getByRole("button", { name: "调整机柜 A-01 的顺序" }), {
      key: "ArrowRight",
    })

    await waitFor(() => {
      const frames = screen.getAllByRole("region")
      expect(frames.map((frame) => frame.getAttribute("aria-label"))).toEqual([
        "A-01，42U",
        "A-02，27U",
      ])
    })
  })
})
