import { describe, expect, it } from "vitest"

import {
  clampCanvasZoom,
  deviceGrabOffset,
  droppedDeviceStartU,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  placementGeometry,
  reorderRackIds,
  U_HEIGHT,
} from "./layout"

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

describe("device drag geometry", () => {
  it("keeps the grabbed device unit under the pointer when dropping", () => {
    expect(deviceGrabOffset(74, 52, 52, 4)).toBe(2)
    expect(droppedDeviceStartU(117, 0, 234, 18, 4, 2)).toBe(8)
    expect(droppedDeviceStartU(-20, 0, 234, 18, 4, 2)).toBe(15)
  })
})

describe("canvas zoom", () => {
  it("clamps and rounds zoom levels", () => {
    expect(clampCanvasZoom(0.42)).toBe(MIN_CANVAS_ZOOM)
    expect(clampCanvasZoom(1.04)).toBe(1)
    expect(clampCanvasZoom(1.71)).toBe(MAX_CANVAS_ZOOM)
  })
})

describe("reorderRackIds", () => {
  const ids = ["rack-1", "rack-2", "rack-3"]

  it("moves a rack before or after the target", () => {
    expect(reorderRackIds(ids, "rack-3", "rack-1", "before")).toEqual([
      "rack-3",
      "rack-1",
      "rack-2",
    ])
    expect(reorderRackIds(ids, "rack-1", "rack-3", "after")).toEqual([
      "rack-2",
      "rack-3",
      "rack-1",
    ])
  })

  it("leaves invalid and no-op moves unchanged", () => {
    expect(reorderRackIds(ids, "rack-1", "rack-1", "before")).toBe(ids)
    expect(reorderRackIds(ids, "missing", "rack-1", "before")).toBe(ids)
  })
})
