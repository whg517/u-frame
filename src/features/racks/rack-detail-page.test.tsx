import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { RackViewDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { RackDetailPage } from "./rack-detail-page"

const rackView: RackViewDto = {
  racks: [
    {
      rack: {
        id: "rack-1",
        areaId: "area-1",
        areaName: "网络区",
        roomId: "room-1",
        roomName: "上海机房",
        code: "R-A01-01",
        specification: "42U",
        totalU: 42,
        powerCapacityW: 8000,
        status: "active",
        notes: "核心网络机柜",
      },
      placements: [
        {
          placementId: "placement-1",
          assetId: "asset-1",
          name: "边界防火墙",
          type: "firewall",
          status: "active",
          hostname: "fw-edge-01",
          intranetIp: "10.0.0.10",
          serialNumber: "SN-001",
          vendor: "Example",
          model: "FW-2U",
          purpose: "边界防护",
          startU: 40,
          endU: 41,
          heightU: 2,
        },
      ],
    },
  ],
}

afterEach(() => vi.restoreAllMocks())

describe("RackDetailPage", () => {
  it("shows capacity, location, and installed assets", async () => {
    vi.spyOn(tauriClient, "getRackView").mockResolvedValue(rackView)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/racks/rack-1"]}>
          <Routes>
            <Route path="/racks/:rackId" element={<RackDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole("heading", { name: "R-A01-01" })).toBeInTheDocument()
    expect(screen.getByText("40U")).toBeInTheDocument()
    expect(screen.getByText("5%")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "编辑机柜" })).toHaveAttribute(
      "href",
      "/racks/rack-1/edit",
    )
    expect(screen.getByRole("link", { name: "边界防火墙" })).toHaveAttribute(
      "href",
      "/assets/asset-1",
    )
  })
})
