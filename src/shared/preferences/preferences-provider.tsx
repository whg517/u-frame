import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { setActiveLanguage } from "@/shared/i18n/i18n"
import {
  applyPreferences,
  defaultPreferences,
  readPreferences,
  writePreferences,
  type Preferences,
} from "./preferences"

interface PreferencesContextValue {
  preferences: Preferences
  updatePreferences: (changes: Partial<Preferences>) => void
  resetPreferences: () => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({
  children,
  initialPreferences = readPreferences(),
}: {
  children: ReactNode
  initialPreferences?: Preferences
}) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  )

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (event: MediaQueryListEvent) => setSystemIsDark(event.matches)
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    setActiveLanguage(preferences.language)
    applyPreferences(preferences, systemIsDark)
    writePreferences(preferences)
  }, [preferences, systemIsDark])

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    updatePreferences: (changes) => {
      if (changes.language) setActiveLanguage(changes.language)
      setPreferences((current) => ({ ...current, ...changes }))
    },
    resetPreferences: () => {
      setActiveLanguage(defaultPreferences.language)
      setPreferences(defaultPreferences)
    },
  }), [preferences])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider")
  return context
}
