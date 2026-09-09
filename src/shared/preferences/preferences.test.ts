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
        ? JSON.stringify({
            themeMode: "dark",
            accentColor: "invalid",
            language: "en-US",
            defaultCanvasZoom: 1.4,
            interfaceDensity: "compact",
            interfaceFontSize: "large",
            defaultStartupPage: "assets",
          })
        : null,
    }

    expect(readPreferences(storage)).toEqual({
      themeMode: "dark",
      accentColor: "neutral",
      language: "en-US",
      defaultCanvasZoom: 1.4,
      interfaceDensity: "compact",
      interfaceFontSize: "large",
      defaultStartupPage: "assets",
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

  it("defaults legacy and unsupported interface sizing values", () => {
    expect(readPreferences({ getItem: () => JSON.stringify({}) })).toMatchObject({
      interfaceDensity: "standard",
      interfaceFontSize: "standard",
    })
    expect(readPreferences({
      getItem: () => JSON.stringify({ interfaceDensity: "dense", interfaceFontSize: "huge" }),
    })).toMatchObject({
      interfaceDensity: "standard",
      interfaceFontSize: "standard",
    })
  })

  it("defaults legacy and unsupported startup pages to the rack overview", () => {
    expect(readPreferences({ getItem: () => JSON.stringify({}) }).defaultStartupPage).toBe("rackOverview")
    expect(readPreferences({
      getItem: () => JSON.stringify({ defaultStartupPage: "settings" }),
    }).defaultStartupPage).toBe("rackOverview")
  })

  it("resolves system mode and applies document attributes", () => {
    const root = document.createElement("html")
    applyPreferences({
      themeMode: "system",
      accentColor: "blue",
      language: "en-US",
      defaultCanvasZoom: 1.2,
      interfaceDensity: "compact",
      interfaceFontSize: "large",
      defaultStartupPage: "locations",
    }, true, root)

    expect(isDarkMode("system", true)).toBe(true)
    expect(root).toHaveClass("dark")
    expect(root).toHaveAttribute("data-theme-mode", "system")
    expect(root).toHaveAttribute("data-accent", "blue")
    expect(root).toHaveAttribute("data-density", "compact")
    expect(root).toHaveAttribute("data-font-size", "large")
    expect(root).toHaveAttribute("lang", "en-US")
    expect(root.style.colorScheme).toBe("dark")
  })
})
