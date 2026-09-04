import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CanvasZoomControls } from "./canvas-zoom-controls"

describe("CanvasZoomControls", () => {
  it("shows the active zoom and exposes all zoom actions", () => {
    const zoomOut = vi.fn()
    const reset = vi.fn()
    const zoomIn = vi.fn()
    render(
      <CanvasZoomControls
        zoom={0.8}
        onZoomOut={zoomOut}
        onReset={reset}
        onZoomIn={zoomIn}
      />,
    )

    expect(screen.getByText("80%")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "缩小画布" }))
    fireEvent.click(screen.getByRole("button", { name: "重置画布缩放，当前 80%" }))
    fireEvent.click(screen.getByRole("button", { name: "放大画布" }))
    expect(zoomOut).toHaveBeenCalledOnce()
    expect(reset).toHaveBeenCalledOnce()
    expect(zoomIn).toHaveBeenCalledOnce()
  })
})
