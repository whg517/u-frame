import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AssetDto, RackDto, RackViewDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { PlacementFormPage } from "./placement-form-page"

const racks: RackDto[] = [
  {
    id: "rack-1", areaId: "area-1", areaName: "A 区", roomId: "room-1", roomName: "上海机房",
    code: "A-01", specification: "42U", totalU: 42, powerCapacityW: null, status: "active", notes: null,
  },
  {
    id: "rack-2", areaId: "area-2", areaName: "B 区", roomId: "room-1", roomName: "上海机房",
    code: "B-01", specification: "18U", totalU: 18, powerCapacityW: null, status: "active", notes: null,
  },
]

const asset: AssetDto = {
  id: "asset-1", type: "server", name: "订单服务器", hostname: "order-01", intranetIp: null,
  managementIp: null, serialNumber: null, vendor: null, model: null, purpose: null, heightU: 2,
  status: "active", notes: null,
  placement: {
    placementId: "placement-1", rackId: "rack-1", rackCode: "A-01", areaId: "area-1",
    areaName: "A 区", roomId: "room-1", roomName: "上海机房", startU: 10, endU: 11,
  },
}

const view: RackViewDto = {
  racks: [
    {
      rack: racks[0],
      placements: [
        {
          placementId: "placement-1", assetId: "asset-1", name: "订单服务器", type: "server",
          status: "active", hostname: "order-01", intranetIp: null, serialNumber: null, vendor: null,
          model: null, purpose: null, startU: 10, endU: 11, heightU: 2,
        },
        {
          placementId: "placement-2", assetId: "asset-2", name: "数据库服务器", type: "server",
          status: "active", hostname: "db-01", intranetIp: null, serialNumber: null, vendor: null,
          model: null, purpose: null, startU: 4, endU: 5, heightU: 2,
        },
      ],
    },
    { rack: racks[1], placements: [] },
  ],
}

function renderPage(path: string) {
  vi.spyOn(tauriClient, "listAssets").mockResolvedValue([asset])
  vi.spyOn(tauriClient, "listRacks").mockResolvedValue(racks)
  vi.spyOn(tauriClient, "getRackView").mockResolvedValue(view)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/assets/:assetId/place" element={<PlacementFormPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("PlacementFormPage", () => {
  it("moves a placed asset with target context and continuous free-space guidance", async () => {
    const move = vi.spyOn(tauriClient, "moveAsset").mockResolvedValue({
      id: "placement-3", rackId: "rack-2", assetId: "asset-1", startU: 1, endU: 2,
      heightU: 2, placedAt: "2026-09-06T10:00:00Z",
    })
    renderPage("/assets/asset-1/place?rackId=rack-2&returnTo=%2Fassets%3Fq%3Dorder")

    expect(await screen.findByRole("heading", { name: "移动设备" })).toBeInTheDocument()
    expect(screen.getByText(/当前位置：上海机房 \/ A 区 \/ A-01/)).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "U1–U18 · 18U" })).toBeInTheDocument()
    const confirm = screen.getByRole("button", { name: "确认移动" })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)

    await waitFor(() => expect(move).toHaveBeenCalledWith({ assetId: "asset-1", rackId: "rack-2", startU: 1 }))
  })

  it("shows the conflicting device and prevents an invalid move", async () => {
    renderPage("/assets/asset-1/place")
    await screen.findByRole("heading", { name: "移动设备" })

    fireEvent.change(screen.getByLabelText("起始 U 位"), { target: { value: "4" } })

    expect(screen.getByText(/与 数据库服务器（U4–U5）冲突/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "确认移动" })).toBeDisabled()
  })
})
