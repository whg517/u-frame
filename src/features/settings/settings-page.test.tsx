import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { AppProvider } from "@/app/provider"
import { AppLayout } from "@/app/layout"
import { setActiveLanguage } from "@/shared/i18n/i18n"
import { defaultPreferences, preferencesStorageKey } from "@/shared/preferences/preferences"
import { SettingsPage } from "./settings-page"

describe("SettingsPage", () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActiveLanguage("zh-CN")
    document.documentElement.className = ""
    document.documentElement.removeAttribute("data-theme-mode")
    document.documentElement.removeAttribute("data-accent")
    document.documentElement.removeAttribute("data-density")
    document.documentElement.removeAttribute("data-font-size")
  })

  it("applies and persists appearance and language preferences immediately", async () => {
    render(
      <AppProvider>
        <MemoryRouter initialEntries={["/settings"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "深色" }))
    fireEvent.click(screen.getByRole("button", { name: "蓝色" }))
    fireEvent.click(screen.getByRole("button", { name: "120%" }))
    fireEvent.click(screen.getByRole("button", { name: "紧凑密度" }))
    fireEvent.click(screen.getByRole("button", { name: "大字号" }))
    fireEvent.click(screen.getByRole("button", { name: "设备资产" }))
    fireEvent.click(screen.getByRole("button", { name: "英语" }))

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Assets" })).toBeInTheDocument()
    expect(document.documentElement).toHaveClass("dark")
    expect(document.documentElement).toHaveAttribute("data-accent", "blue")
    expect(document.documentElement).toHaveAttribute("data-density", "compact")
    expect(document.documentElement).toHaveAttribute("data-font-size", "large")
    expect(document.documentElement).toHaveAttribute("lang", "en-US")
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(preferencesStorageKey) ?? "{}")).toEqual({
        themeMode: "dark",
        accentColor: "blue",
        language: "en-US",
        defaultCanvasZoom: 1.2,
        interfaceDensity: "compact",
        interfaceFontSize: "large",
        defaultStartupPage: "assets",
      })
    })
  })

  it("restores every preference to the documented defaults", async () => {
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify({
      themeMode: "dark",
      accentColor: "violet",
      language: "en-US",
      defaultCanvasZoom: 1.4,
      interfaceDensity: "spacious",
      interfaceFontSize: "large",
      defaultStartupPage: "racks",
    }))
    setActiveLanguage("en-US")
    render(<AppProvider><SettingsPage /></AppProvider>)

    fireEvent.click(await screen.findByRole("button", { name: "Restore defaults" }))

    expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument()
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(preferencesStorageKey) ?? "{}")).toEqual(defaultPreferences)
    })
  })
})
