import { act, fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, expect, it, vi } from "vitest"
import { AppProvider } from "./provider"
import { routes } from "./routes"
import { AppLayout } from "./layout"
import { RouteErrorPage } from "./route-state"
import { tauriClient } from "@/shared/lib/tauri-client/client"

afterEach(() => vi.restoreAllMocks())

it("opens a lazy deep link, keeps navigation, and handles unknown paths", async () => {
  vi.spyOn(tauriClient, "listAssets").mockResolvedValue([])
  const router = createMemoryRouter(routes, { initialEntries: ["/assets"] })
  render(<AppProvider><RouterProvider router={router} /></AppProvider>)
  expect(await screen.findByRole("heading", { name: "设备资产" })).toBeInTheDocument()
  fireEvent.click(screen.getByRole("link", { name: "设置" }))
  expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument()
  await act(() => router.navigate("/missing-page"))
  expect(await screen.findByRole("heading", { name: "页面不存在" })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "机柜一览" })).toBeInTheDocument()
})

it("keeps the sidebar usable after a page render fails without showing internals", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  function BrokenPage(): never { throw new Error("private SQL and file path") }
  const router = createMemoryRouter([{
    Component: AppLayout,
    children: [{
      ErrorBoundary: RouteErrorPage,
      children: [{ path: "/broken", Component: BrokenPage }, { path: "/", element: <h1>工作画布</h1> }],
    }],
  }], { initialEntries: ["/broken"] })
  render(<AppProvider><RouterProvider router={router} /></AppProvider>)
  expect(await screen.findByRole("heading", { name: "页面暂时无法打开" })).toBeInTheDocument()
  expect(screen.queryByText("private SQL and file path")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("link", { name: "机柜一览" }))
  expect(await screen.findByRole("heading", { name: "工作画布" })).toBeInTheDocument()
})
