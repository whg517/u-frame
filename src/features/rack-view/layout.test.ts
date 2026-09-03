import { describe, expect, it } from "vitest"

import { placementGeometry, U_HEIGHT } from "./layout"

describe("placementGeometry", () => {
  it("anchors U1 at the rack baseline", () => {
    expect(placementGeometry(1, 1)).toEqual({ bottom: 0, height: U_HEIGHT })
  })

  it("places a multi-U asset from its lowest occupied unit", () => {
    expect(placementGeometry(19, 4)).toEqual({
      bottom: 18 * U_HEIGHT,
      height: 4 * U_HEIGHT,
    })
  })
})
