import { afterEach, describe, expect, it } from "vitest"
import { setActiveLanguage } from "@/shared/i18n/i18n"
import { CommandError } from "./tauri-client/client"
import { errorMessage } from "./errors"

afterEach(() => setActiveLanguage("zh-CN"))

describe("user-facing errors", () => {
  it.each(["zh-CN", "en-US"] as const)("explains occupied rack height in %s", (language) => {
    setActiveLanguage(language)
    const message = errorMessage(new CommandError({
      code: "Rack.HeightOccupied", message: "internal database detail", details: null, operationId: "op-123",
    }))
    expect(message).toBe(language === "zh-CN"
      ? "机柜缩容会使已上架设备越界，请先调整设备位置。"
      : "Reducing the rack height would put mounted devices out of range. Move them first.")
  })

  it("keeps unknown business failures traceable and hides transport internals", () => {
    expect(errorMessage(new CommandError({
      code: "Future.Error", message: "SQL private", details: null, operationId: "op-123",
    }))).toBe("操作失败（op-123）")
    expect(errorMessage(new Error("private/path.sqlite3: SELECT * FROM assets"))).toBe("操作失败，请重试。")
  })
})
