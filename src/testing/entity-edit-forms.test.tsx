import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AreaFormPage } from "@/features/locations/area-form-page"
import { RoomFormPage } from "@/features/locations/room-form-page"
import { AssetFormPage } from "@/features/assets/asset-form-page"
import { RackFormPage } from "@/features/racks/rack-form-page"
import type { AssetDto, LocationTreeDto, RackDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { queryKeys } from "@/shared/lib/query-keys"

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
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={route} element={element} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...rendered, queryClient }
}

afterEach(() => vi.restoreAllMocks())

describe("entity edit forms", () => {
  it.each([
    { path: "/locations/areas/new?roomId=room-1", route: "/locations/areas/new", element: <AreaFormPage />, label: "所属机房", initial: "room-1", selected: "room-2" },
    { path: "/racks/new?areaId=area-1", route: "/racks/new", element: <RackFormPage />, label: "所属区域", initial: "area-1", selected: "area-2" },
  ])("does not reapply contextual defaults after a user selects another parent: $route", async ({ path, route, element, label, initial, selected }) => {
    const options: LocationTreeDto = { rooms: [locations.rooms[0], {
      room: { ...locations.rooms[0].room, id: "room-2", code: "BJ", name: "北京机房" },
      areas: [{ ...locations.rooms[0].areas[0], id: "area-2", roomId: "room-2" }],
    }] }
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(options)
    vi.spyOn(tauriClient, "listRacks").mockResolvedValue([])
    const { queryClient } = renderRoute(path, route, element)
    const parent = screen.getByLabelText(label)
    await waitFor(() => expect(parent).toHaveValue(initial))
    fireEvent.change(parent, { target: { value: selected } })
    await act(async () => {
      queryClient.setQueryData(queryKeys.locations, { rooms: options.rooms.map((item) => ({
        ...item, room: { ...item.room, description: "后台刷新" },
      })) })
    })
    expect(parent).toHaveValue(selected)
  })

  it.each([
    { path: "/locations/rooms/room-1/edit", route: "/locations/rooms/:roomId/edit", element: <RoomFormPage />, initial: "上海机房" },
    { path: "/locations/areas/area-1/edit", route: "/locations/areas/:areaId/edit", element: <AreaFormPage />, initial: "A 区" },
    { path: "/racks/rack-1/edit", route: "/racks/:rackId/edit", element: <RackFormPage />, initial: "A-01" },
    { path: "/assets/asset-1/edit", route: "/assets/:assetId/edit", element: <AssetFormPage />, initial: "应用服务器" },
  ])("preserves the edit draft when cached data refreshes: $path", async ({ path, route, element, initial }) => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    vi.spyOn(tauriClient, "listRacks").mockResolvedValue([rack])
    vi.spyOn(tauriClient, "listAssets").mockResolvedValue([asset])
    const { queryClient } = renderRoute(path, route, element)
    const input = await screen.findByDisplayValue(initial)
    fireEvent.change(input, { target: { value: "尚未保存的修改" } })
    await act(async () => {
      queryClient.setQueryData(queryKeys.locations, {
        rooms: [{ room: { ...locations.rooms[0].room, description: "已刷新" }, areas: [{ ...locations.rooms[0].areas[0], description: "已刷新" }] }],
      })
      queryClient.setQueryData(queryKeys.racks(), [{ ...rack, notes: "已刷新" }])
      queryClient.setQueryData(queryKeys.assets, [{ ...asset, notes: "已刷新" }])
    })
    expect(input).toHaveValue("尚未保存的修改")
  })

  it.each(["999.1.1.1", "abcd", "::::", "2001:db8:::1"])("rejects malformed IP %s before IPC", async (ip) => {
    vi.spyOn(tauriClient, "listAssets").mockResolvedValue([asset])
    const update = vi.spyOn(tauriClient, "updateAsset")
    renderRoute("/assets/asset-1/edit", "/assets/:assetId/edit", <AssetFormPage />)
    await screen.findByDisplayValue("应用服务器")
    fireEvent.change(screen.getByLabelText("管理 IP"), { target: { value: ip } })
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }))
    expect(await screen.findByText("请输入有效的 IP 地址")).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

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

  it("accepts valid IPv6 and trims surrounding whitespace before IPC", async () => {
    vi.spyOn(tauriClient, "listAssets").mockResolvedValue([asset])
    const update = vi.spyOn(tauriClient, "updateAsset").mockResolvedValue(asset)
    renderRoute("/assets/asset-1/edit", "/assets/:assetId/edit", <AssetFormPage />)
    await screen.findByDisplayValue("应用服务器")
    fireEvent.change(screen.getByLabelText("管理 IP"), { target: { value: " 2001:db8::1 " } })
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ managementIp: "2001:db8::1" })))
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
