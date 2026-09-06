import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AssetDto, RackDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { AssetsPage } from "./assets-page"

const rack: RackDto = {
  id: "rack-1", areaId: "area-1", areaName: "服务器区", roomId: "room-1",
  roomName: "上海机房", code: "A-01", specification: "42U", totalU: 42,
  powerCapacityW: null, status: "active", notes: null,
}

const assets: AssetDto[] = [
  {
    id: "asset-1", type: "server", name: "订单服务器", hostname: "order-01",
    intranetIp: "10.0.0.10", managementIp: null, serialNumber: "SN-01", vendor: "Example",
    model: "R2", purpose: null, heightU: 2, status: "active", notes: null,
    placement: {
      placementId: "placement-1", rackId: "rack-1", rackCode: "A-01", areaId: "area-1",
      areaName: "服务器区", roomId: "room-1", roomName: "上海机房", startU: 10, endU: 11,
    },
  },
  {
    id: "asset-2", type: "switch", name: "备用交换机", hostname: "switch-spare",
    intranetIp: null, managementIp: null, serialNumber: "SN-02", vendor: "Example",
    model: "S24", purpose: null, heightU: 1, status: "offline", notes: null, placement: null,
  },
]

function renderPage(path = "/assets") {
  vi.spyOn(tauriClient, "listAssets").mockResolvedValue(assets)
  vi.spyOn(tauriClient, "listRacks").mockResolvedValue([rack])
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/assets" element={<AssetsPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("AssetsPage", () => {
  it("searches across device identity fields and keeps rows directly navigable", async () => {
    renderPage()
    await screen.findByRole("row", { name: "查看设备 订单服务器" })

    fireEvent.change(screen.getByLabelText("搜索设备"), { target: { value: "switch-spare" } })

    expect(screen.queryByRole("row", { name: "查看设备 订单服务器" })).not.toBeInTheDocument()
    expect(screen.getByRole("row", { name: "查看设备 备用交换机" })).toBeInTheDocument()
  })

  it("uses rack context to select and place an existing unplaced device", async () => {
    renderPage("/assets?placement=unplaced&rackId=rack-1&returnTo=%2Fracks%2Frack-1")

    expect(await screen.findByRole("heading", { name: "选择设备上架到 A-01" })).toBeInTheDocument()
    expect(screen.queryByRole("row", { name: "查看设备 订单服务器" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "上架到 A-01" })).toHaveAttribute(
      "href",
      "/assets/asset-2/place?rackId=rack-1&returnTo=%2Fracks%2Frack-1",
    )
  })
})
