import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AssetDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { AssetDetailPage } from "./asset-detail-page"

const asset: AssetDto = {
  id: "asset-1",
  type: "server",
  name: "应用服务器 01",
  hostname: "app-01",
  intranetIp: "10.0.1.21",
  managementIp: "10.0.9.21",
  serialNumber: "SN-APP-01",
  vendor: "Example",
  model: "R2",
  purpose: "订单服务",
  heightU: 2,
  status: "active",
  notes: "生产设备",
  placement: {
    placementId: "placement-1",
    rackId: "rack-1",
    rackCode: "R-A01-01",
    areaId: "area-1",
    areaName: "服务器区",
    roomId: "room-1",
    roomName: "上海机房",
    startU: 10,
    endU: 11,
  },
}

afterEach(() => vi.restoreAllMocks())

describe("AssetDetailPage", () => {
  it("shows full identity and links the current placement", async () => {
    vi.spyOn(tauriClient, "listAssets").mockResolvedValue([asset])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/assets/asset-1"]}>
          <Routes>
            <Route path="/assets/:assetId" element={<AssetDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole("heading", { name: "应用服务器 01" })).toBeInTheDocument()
    expect(screen.getByText("10.0.9.21")).toBeInTheDocument()
    expect(screen.getByText("U10–U11")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "R-A01-01" })).toHaveAttribute(
      "href",
      "/racks/rack-1",
    )
  })
})
