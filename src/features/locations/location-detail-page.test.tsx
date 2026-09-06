import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { LocationTreeDto, RackDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { AreaDetailPage, RoomDetailPage } from "./location-detail-page"

const locations: LocationTreeDto = {
  rooms: [
    {
      room: {
        id: "room-1",
        code: "DC-SH",
        name: "上海机房",
        description: "核心机房",
        status: "active",
      },
      areas: [
        {
          id: "area-1",
          roomId: "room-1",
          code: "A01",
          name: "网络区",
          description: "网络设备区域",
          status: "active",
        },
      ],
    },
  ],
}

const rack: RackDto = {
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
  notes: null,
}

function renderRoute(path: string, route: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("location details", () => {
  it("shows a room summary and links to its areas", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    vi.spyOn(tauriClient, "listRacks").mockResolvedValue([rack])

    renderRoute("/locations/rooms/room-1", "/locations/rooms/:roomId", <RoomDetailPage />)

    expect(await screen.findByRole("heading", { name: "上海机房" })).toBeInTheDocument()
    expect(screen.getByText("核心机房")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "编辑机房" })).toHaveAttribute(
      "href",
      "/locations/rooms/room-1/edit",
    )
    expect(screen.getByRole("link", { name: /网络区/ })).toHaveAttribute(
      "href",
      "/locations/areas/area-1?returnTo=%2Flocations%2Frooms%2Froom-1",
    )
  })

  it("shows an area summary and links to its racks", async () => {
    vi.spyOn(tauriClient, "listLocations").mockResolvedValue(locations)
    vi.spyOn(tauriClient, "listRacks").mockResolvedValue([rack])

    renderRoute("/locations/areas/area-1", "/locations/areas/:areaId", <AreaDetailPage />)

    expect(await screen.findByRole("heading", { name: "网络区" })).toBeInTheDocument()
    expect(screen.getAllByText("42U")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "编辑区域" })).toHaveAttribute(
      "href",
      "/locations/areas/area-1/edit",
    )
    expect(screen.getByRole("link", { name: /R-A01-01/ })).toHaveAttribute(
      "href",
      "/racks/rack-1?returnTo=%2Flocations%2Fareas%2Farea-1",
    )
  })
})
