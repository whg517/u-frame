import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageHeader } from "./page"

describe("PageHeader", () => {
  it("uses the shared workspace header height", () => {
    render(<PageHeader title="设备资产" description="设备说明" />)

    expect(screen.getByRole("banner")).toHaveClass("h-24", "shrink-0")
  })
})
