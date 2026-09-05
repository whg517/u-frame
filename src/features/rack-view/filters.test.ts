import { describe, expect, it } from "vitest"

import type { RackCanvasDto } from "@/shared/lib/tauri-client/bindings"
import { filterRackCanvases, replaceFilterValues } from "./filters"

const racks = [
  { rack: { id: "rack-a", roomId: "room-a", areaId: "area-a" } },
  { rack: { id: "rack-b", roomId: "room-b", areaId: "area-b" } },
] as RackCanvasDto[]

describe("rack canvas filters", () => {
  it("treats empty selections as all and supports multiple values", () => {
    expect(filterRackCanvases(racks, [], [])).toHaveLength(2)
    expect(filterRackCanvases(racks, ["room-a", "room-b"], ["area-b"]))
      .toEqual([racks[1]])
  })

  it("writes repeated URL parameters without losing unrelated state", () => {
    const params = replaceFilterValues(
      new URLSearchParams("room=old&area=area-a&zoom=80&highlight=asset-a"),
      "room",
      ["room-a", "room-b"],
    )
    expect(params.getAll("room")).toEqual(["room-a", "room-b"])
    expect(params.get("area")).toBe("area-a")
    expect(params.get("zoom")).toBe("80")
    expect(params.has("highlight")).toBe(false)
  })
})
