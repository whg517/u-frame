import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
      placements: [],
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
})
