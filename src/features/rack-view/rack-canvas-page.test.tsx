import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { LocationTreeDto, RackViewDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { RackCanvasPage } from "./rack-canvas-page"

const locations: LocationTreeDto = {
  rooms: [
    {
      room: { id: "room-a", code: "SH", name: "上海机房", description: null, status: "active" },
      areas: [{ id: "area-a", roomId: "room-a", code: "A", name: "A 区", description: null, status: "active" }],
    },
    {
      room: { id: "room-b", code: "HZ", name: "杭州机房", description: null, status: "active" },
      areas: [{ id: "area-b", roomId: "room-b", code: "B", name: "B 区", description: null, status: "active" }],
    },
  ],
}

const view: RackViewDto = {
  racks: [
    {
      rack: { id: "rack-a", areaId: "area-a", areaName: "A 区", roomId: "room-a", roomName: "上海机房", code: "A-01", specification: "18U", totalU: 18, powerCapacityW: null, status: "active", notes: null },
      placements: [{
        placementId: "placement-a", assetId: "asset-a", name: "计算节点",
        type: "server", status: "active", hostname: null, intranetIp: null,
        serialNumber: null, vendor: null, model: null, purpose: null,
        startU: 4, endU: 4, heightU: 1,
      }],
    },
    {
      rack: { id: "rack-b", areaId: "area-b", areaName: "B 区", roomId: "room-b", roomName: "杭州机房", code: "B-01", specification: "18U", totalU: 18, powerCapacityW: null, status: "active", notes: null },
      placements: [],
    },
  ],
}

afterEach(() => vi.restoreAllMocks())

describe("RackCanvasPage location filters", () => {
  it("keeps canvas context when the empty state starts rack creation", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue({ rooms: [locations.rooms[0]] })
    vi.spyOn(tauriClient, "getRackView").mockResolvedValue({ racks: [] })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes><Route path="/" element={<RackCanvasPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole("banner")).toHaveClass("h-24", "shrink-0")
    expect(await screen.findByRole("button", { name: "创建机柜" })).toHaveAttribute(
      "href",
      "/racks/new?areaId=area-a&returnTo=%2F",
    )
  })

  it("loads the full projection and combines repeated room and area selections", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    const getRackView = vi.spyOn(tauriClient, "getRackView").mockResolvedValue(view)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/?room=room-a&area=area-a"]}>
          <Routes><Route path="/" element={<RackCanvasPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole("region", { name: "A-01，18U" })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "B-01，18U" })).not.toBeInTheDocument()
    expect(getRackView).toHaveBeenCalledWith()

    fireEvent.click(screen.getByLabelText("机房筛选：上海机房"))
    fireEvent.click(screen.getByRole("checkbox", { name: /杭州机房/ }))
    fireEvent.click(screen.getByLabelText("区域筛选：A 区"))
    fireEvent.click(screen.getByRole("checkbox", { name: /B 区/ }))

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "A-01，18U" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "B-01，18U" })).toBeInTheDocument()
    })
    expect(screen.getByLabelText("机房筛选：上海机房、杭州机房")).toBeInTheDocument()
    expect(screen.getByLabelText("区域筛选：A 区、B 区")).toBeInTheDocument()
  })

  it("stages device moves in edit mode and persists them only after save", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    vi.spyOn(tauriClient, "getRackView").mockResolvedValue(view)
    const moveAssets = vi.spyOn(tauriClient, "moveAssets").mockResolvedValue({
      placements: [{
        id: "placement-new", rackId: "rack-b", assetId: "asset-a",
        startU: 7, endU: 7, heightU: 1, placedAt: "2026-09-07T00:00:00Z",
      }],
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes><Route path="/" element={<RackCanvasPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const device = await screen.findByRole("button", { name: "计算节点，U4 到 U4" })
    expect(screen.queryByRole("button", { name: "保存调整" })).not.toBeInTheDocument()
    const targetRack = screen.getByRole("region", { name: "B-01，18U" })
    const targetBody = targetRack.querySelector(".rack-body") as HTMLDivElement
    vi.spyOn(device, "getBoundingClientRect").mockReturnValue({
      top: 0, bottom: 13, height: 13, left: 0, right: 100, width: 100,
      x: 0, y: 0, toJSON: () => ({}),
    })
    vi.spyOn(targetBody, "getBoundingClientRect").mockReturnValue({
      top: 0, bottom: 234, height: 234, left: 0, right: 200, width: 200,
      x: 0, y: 0, toJSON: () => ({}),
    })
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() }
    const dragStart = createEvent.dragStart(device, { dataTransfer })
    Object.defineProperty(dragStart, "clientY", { value: 6 })
    fireEvent(device, dragStart)
    const dragOver = createEvent.dragOver(targetBody, { dataTransfer })
    Object.defineProperty(dragOver, "clientY", { value: 150 })
    fireEvent(targetBody, dragOver)
    fireEvent.drop(targetBody, { clientY: 150, dataTransfer })

    expect(moveAssets).not.toHaveBeenCalled()
    expect(screen.getByText("布局编辑中 · 已调整 1 台设备")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "保存调整" }))
    await waitFor(() => expect(moveAssets).toHaveBeenCalledWith({
      moves: [{ assetId: "asset-a", rackId: "rack-b", startU: 7 }],
    }))
    await screen.findByRole("button", { name: "编辑布局" })
  })
})
