import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AreaFormPage } from "@/features/locations/area-form-page"
import { RoomFormPage } from "@/features/locations/room-form-page"
import { AssetFormPage } from "@/features/assets/asset-form-page"
import { RackFormPage } from "@/features/racks/rack-form-page"
import type { AssetDto, LocationTreeDto, RackDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"

const locations: LocationTreeDto = {
  rooms: [{
    room: { id: "room-1", code: "SH", name: "上海机房", description: "核心", status: "active" },
    areas: [{ id: "area-1", roomId: "room-1", code: "A", name: "A 区", description: "生产", status: "active" }],
  }],
}

const rack: RackDto = {
  id: "rack-1", areaId: "area-1", areaName: "A 区", roomId: "room-1",
  roomName: "上海机房", code: "A-01", specification: "42U", totalU: 42,
  powerCapacityW: 6000, status: "active", notes: "主机柜",
}

const asset: AssetDto = {
  id: "asset-1", type: "server", name: "应用服务器", hostname: "app-01",
  intranetIp: "10.0.0.10", managementIp: "10.0.1.10", serialNumber: "SN-01",
  vendor: "Example", model: "R2", purpose: "应用", heightU: 2,
  status: "active", notes: "生产", placement: null,
}

function renderRoute(path: string, route: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={route} element={element} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("entity edit forms", () => {
  it("prefills a contextual rack and preserves the originating canvas", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    vi.spyOn(tauriClient, "listRacks").mockResolvedValue([rack])
    renderRoute(
      "/racks/new?areaId=area-1&returnTo=%2F%3Farea%3Darea-1",
      "/racks/new",
      <RackFormPage />,
    )

    const area = await screen.findByLabelText("所属区域")
    await waitFor(() => expect(area).toHaveValue("area-1"))
    expect(screen.getByRole("button", { name: "取消" })).toHaveAttribute("href", "/?area=area-1")
  })

  it("prefills and updates every room field", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    const update = vi.spyOn(tauriClient, "updateRoom").mockResolvedValue(locations.rooms[0].room)
    renderRoute("/locations/rooms/room-1/edit", "/locations/rooms/:roomId/edit", <RoomFormPage />)

    const name = await screen.findByDisplayValue("上海机房")
    fireEvent.change(name, { target: { value: "上海新机房" } })
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({
      roomId: "room-1", code: "SH", name: "上海新机房", description: "核心",
    }))
  })

  it("prefills and updates the area including its parent room", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    const update = vi.spyOn(tauriClient, "updateArea").mockResolvedValue(locations.rooms[0].areas[0])
    renderRoute("/locations/areas/area-1/edit", "/locations/areas/:areaId/edit", <AreaFormPage />)

    const name = await screen.findByDisplayValue("A 区")
    expect(screen.getByLabelText("所属机房")).toHaveValue("room-1")
    fireEvent.change(name, { target: { value: "核心区" } })
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({
      areaId: "area-1", roomId: "room-1", code: "A", name: "核心区", description: "生产",
    }))
  })

  it("prefills and updates rack placement and capacity fields", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    vi.spyOn(tauriClient, "listRacks").mockResolvedValue([rack])
    const update = vi.spyOn(tauriClient, "updateRack").mockResolvedValue(rack)
    renderRoute("/racks/rack-1/edit", "/racks/:rackId/edit", <RackFormPage />)

    await screen.findByDisplayValue("A-01")
    expect(screen.getByLabelText("所属区域")).toHaveValue("area-1")
    fireEvent.change(screen.getByLabelText("备注"), { target: { value: "更新后的主机柜" } })
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({
      rackId: "rack-1", areaId: "area-1", code: "A-01", specification: "42U",
      totalU: 42, powerCapacityW: 6000, notes: "更新后的主机柜",
    }))
  })

  it("prefills and updates the complete asset record", async () => {
    vi.spyOn(tauriClient, "listAssets").mockResolvedValue([asset])
    const update = vi.spyOn(tauriClient, "updateAsset").mockResolvedValue(asset)
    renderRoute("/assets/asset-1/edit", "/assets/:assetId/edit", <AssetFormPage />)

    await screen.findByDisplayValue("应用服务器")
    expect(screen.getByLabelText("管理 IP")).toHaveValue("10.0.1.10")
    fireEvent.change(screen.getByLabelText("用途"), { target: { value: "订单服务" } })
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({
      assetId: "asset-1", type: "server", name: "应用服务器", hostname: "app-01",
      intranetIp: "10.0.0.10", managementIp: "10.0.1.10", serialNumber: "SN-01",
      vendor: "Example", model: "R2", purpose: "订单服务", heightU: 2,
      status: "active", notes: "生产",
    }))
  })
})
