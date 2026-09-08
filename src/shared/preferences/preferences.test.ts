import { describe, expect, it } from "vitest"

import {
  applyPreferences,
  defaultPreferences,
  isDarkMode,
  preferencesStorageKey,
  readPreferences,
} from "./preferences"

describe("preferences", () => {
  it("loads valid values and falls back field by field", () => {
    const storage = {
      getItem: (key: string) => key === preferencesStorageKey
        ? JSON.stringify({ themeMode: "dark", accentColor: "invalid", language: "en-US", defaultCanvasZoom: 1.4 })
        : null,
    }

    expect(readPreferences(storage)).toEqual({
      themeMode: "dark",
      accentColor: "neutral",
      language: "en-US",
      defaultCanvasZoom: 1.4,
    })
  })

  it("recovers from unreadable persisted data", () => {
    expect(readPreferences({ getItem: () => "{" })).toEqual(defaultPreferences)
  })

  it("defaults legacy and unsupported canvas zoom values to 100%", () => {
    expect(readPreferences({
      getItem: () => JSON.stringify({ themeMode: "light", accentColor: "green", language: "zh-CN" }),
    }).defaultCanvasZoom).toBe(1)
    expect(readPreferences({
      getItem: () => JSON.stringify({ defaultCanvasZoom: 1.1 }),
    }).defaultCanvasZoom).toBe(1)
  })

  it("resolves system mode and applies document attributes", () => {
    const root = document.createElement("html")
    applyPreferences({ themeMode: "system", accentColor: "blue", language: "en-US", defaultCanvasZoom: 1.2 }, true, root)

    expect(isDarkMode("system", true)).toBe(true)
    expect(root).toHaveClass("dark")
    expect(root).toHaveAttribute("data-theme-mode", "system")
    expect(root).toHaveAttribute("data-accent", "blue")
    expect(root).toHaveAttribute("lang", "en-US")
    expect(root.style.colorScheme).toBe("dark")
  })
})
