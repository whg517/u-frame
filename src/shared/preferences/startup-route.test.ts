import { describe, expect, it, vi } from "vitest"

import { applyStartupRoute, startupPagePaths } from "./startup-route"

describe("startup route preference", () => {
  it("replaces a clean root URL with the selected startup page", () => {
    const replaceState = vi.fn()

    expect(applyStartupRoute(
      "assets",
      { pathname: "/", search: "", hash: "" },
      { replaceState },
    )).toBe(true)
    expect(startupPagePaths.assets).toBe("/assets")
    expect(replaceState).toHaveBeenCalledWith(null, "", "/assets")
  })

  it("keeps the rack overview at root without rewriting history", () => {
    const replaceState = vi.fn()

    expect(applyStartupRoute(
      "rackOverview",
      { pathname: "/", search: "", hash: "" },
      { replaceState },
    )).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
  })

  it.each([
    { pathname: "/assets/asset-a", search: "", hash: "" },
    { pathname: "/", search: "?room=room-a", hash: "" },
    { pathname: "/", search: "", hash: "#asset-a" },
  ])("preserves a deep link or root URL with context: $pathname$search$hash", (location) => {
    const replaceState = vi.fn()

    expect(applyStartupRoute("racks", location, { replaceState })).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
  })
})
