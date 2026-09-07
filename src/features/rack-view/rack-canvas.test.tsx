import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
  onMoveAsset?: (move: { assetId: string; rackId: string; startU: number }) => void
  onEditStart?: () => void
}) {
  return render(
    <RackCanvas
      racks={racks}
      selectedAssetId={null}
      isReordering={false}
      isLayoutEditing={false}
      isLayoutSaving={false}
      draftAssetIds={[]}
      onSelectAsset={overrides?.onSelectAsset ?? vi.fn()}
      onReorderRacks={overrides?.onReorderRacks ?? vi.fn().mockResolvedValue(undefined)}
      onMoveAsset={overrides?.onMoveAsset ?? vi.fn()}
      onEditStart={overrides?.onEditStart ?? vi.fn()}
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

  it("enters edit mode and stages a device drop in another rack", () => {
    const onEditStart = vi.fn()
    const onMoveAsset = vi.fn()
    renderCanvas({ onEditStart, onMoveAsset })
    const device = screen.getByRole("button", { name: "计算节点，U19 到 U22" })
    const targetRack = screen.getByRole("region", { name: "A-02，27U" })
    const targetBody = targetRack.querySelector(".rack-body") as HTMLDivElement
    vi.spyOn(device, "getBoundingClientRect").mockReturnValue({
      top: 0, bottom: 52, height: 52, left: 0, right: 100, width: 100,
      x: 0, y: 0, toJSON: () => ({}),
    })
    vi.spyOn(targetBody, "getBoundingClientRect").mockReturnValue({
      top: 0, bottom: 351, height: 351, left: 0, right: 200, width: 200,
      x: 0, y: 0, toJSON: () => ({}),
    })
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() }

    const dragStart = createEvent.dragStart(device, { dataTransfer })
    Object.defineProperty(dragStart, "clientY", { value: 39 })
    fireEvent(device, dragStart)
    const dragOver = createEvent.dragOver(targetBody, { dataTransfer })
    Object.defineProperty(dragOver, "clientY", { value: 260 })
    fireEvent(targetBody, dragOver)
    fireEvent.drop(targetBody, { clientY: 260, dataTransfer })

    expect(onEditStart).toHaveBeenCalledOnce()
    expect(onMoveAsset).toHaveBeenCalledWith({ assetId: "asset-1", rackId: "rack-2", startU: 7 })
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
