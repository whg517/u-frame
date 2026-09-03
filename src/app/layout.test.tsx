import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"

import { AppLayout } from "./layout"

describe("AppLayout", () => {
  it("keeps the sidebar and main workspace constrained to the viewport", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<p>画布内容</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const shell = container.querySelector('[data-slot="sidebar-wrapper"]')
    const sidebar = container.querySelector('[data-slot="sidebar"]')
    const workspace = screen.getByRole("main")

    expect(shell).toHaveClass("h-dvh", "overflow-hidden")
    expect(sidebar).toHaveClass("h-dvh", "shrink-0")
    expect(workspace).toHaveClass("h-dvh", "overflow-hidden")
    expect(screen.getByText("画布内容")).toBeInTheDocument()
  })
})
