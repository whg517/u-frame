import { describe, expect, it } from "vitest"

import { currentRoute, routeWithParams, safeReturnTo } from "./navigation-context"

describe("navigation context", () => {
  it("accepts only local return paths", () => {
    expect(safeReturnTo("/?area=a", "/assets")).toBe("/?area=a")
    expect(safeReturnTo("https://example.com", "/assets")).toBe("/assets")
    expect(safeReturnTo("//example.com", "/assets")).toBe("/assets")
  })

  it("preserves existing query parameters while adding context", () => {
    expect(routeWithParams("/?room=r", { area: "a", highlight: "asset" }))
      .toBe("/?room=r&area=a&highlight=asset")
  })

  it("joins the active pathname and search", () => {
    expect(currentRoute("/assets", "?q=db")).toBe("/assets?q=db")
  })
})
