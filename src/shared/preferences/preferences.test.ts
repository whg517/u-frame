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
        ? JSON.stringify({ themeMode: "dark", accentColor: "invalid", language: "en-US" })
        : null,
    }

    expect(readPreferences(storage)).toEqual({
      themeMode: "dark",
      accentColor: "neutral",
      language: "en-US",
    })
  })

  it("recovers from unreadable persisted data", () => {
    expect(readPreferences({ getItem: () => "{" })).toEqual(defaultPreferences)
  })

  it("resolves system mode and applies document attributes", () => {
    const root = document.createElement("html")
    applyPreferences({ themeMode: "system", accentColor: "blue", language: "en-US" }, true, root)

    expect(isDarkMode("system", true)).toBe(true)
    expect(root).toHaveClass("dark")
    expect(root).toHaveAttribute("data-theme-mode", "system")
    expect(root).toHaveAttribute("data-accent", "blue")
    expect(root).toHaveAttribute("lang", "en-US")
    expect(root.style.colorScheme).toBe("dark")
  })
})
