import type { AppLanguage } from "@/shared/i18n/i18n"

export type ThemeMode = "system" | "light" | "dark"
export type AccentColor = "neutral" | "blue" | "green" | "orange" | "violet"
export type DefaultCanvasZoom = 0.8 | 1 | 1.2 | 1.4

export interface Preferences {
  themeMode: ThemeMode
  accentColor: AccentColor
  language: AppLanguage
  defaultCanvasZoom: DefaultCanvasZoom
}

export const preferencesStorageKey = "uframe.preferences.v1"

export const defaultPreferences: Preferences = {
  themeMode: "system",
  accentColor: "neutral",
  language: "zh-CN",
  defaultCanvasZoom: 1,
}

const themeModes = new Set<ThemeMode>(["system", "light", "dark"])
const accentColors = new Set<AccentColor>(["neutral", "blue", "green", "orange", "violet"])
const languages = new Set<AppLanguage>(["zh-CN", "en-US"])
const defaultCanvasZooms = new Set<DefaultCanvasZoom>([0.8, 1, 1.2, 1.4])

export function readPreferences(storage: Pick<Storage, "getItem"> = window.localStorage): Preferences {
  try {
    const value = storage.getItem(preferencesStorageKey)
    if (!value) return defaultPreferences
    const parsed = JSON.parse(value) as Partial<Preferences>
    return {
      themeMode: parsed.themeMode && themeModes.has(parsed.themeMode) ? parsed.themeMode : defaultPreferences.themeMode,
      accentColor: parsed.accentColor && accentColors.has(parsed.accentColor) ? parsed.accentColor : defaultPreferences.accentColor,
      language: parsed.language && languages.has(parsed.language) ? parsed.language : defaultPreferences.language,
      defaultCanvasZoom: parsed.defaultCanvasZoom && defaultCanvasZooms.has(parsed.defaultCanvasZoom)
        ? parsed.defaultCanvasZoom
        : defaultPreferences.defaultCanvasZoom,
    }
  } catch {
    return defaultPreferences
  }
}

export function writePreferences(
  preferences: Preferences,
  storage: Pick<Storage, "setItem"> = window.localStorage,
) {
  try {
    storage.setItem(preferencesStorageKey, JSON.stringify(preferences))
  } catch {
    // Preference persistence must never prevent the local application from opening.
  }
}

export function isDarkMode(themeMode: ThemeMode, systemIsDark: boolean) {
  return themeMode === "dark" || (themeMode === "system" && systemIsDark)
}

export function applyPreferences(
  preferences: Preferences,
  systemIsDark: boolean,
  root: HTMLElement = document.documentElement,
) {
  const dark = isDarkMode(preferences.themeMode, systemIsDark)
  root.classList.toggle("dark", dark)
  root.dataset.themeMode = preferences.themeMode
  root.dataset.accent = preferences.accentColor
  root.lang = preferences.language
  root.style.colorScheme = dark ? "dark" : "light"
}
