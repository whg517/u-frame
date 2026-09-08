import { Check, Languages, Paintbrush, RotateCcw, ScanSearch, SunMoon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { usePreferences } from "@/shared/preferences/preferences-provider"
import type { AccentColor, DefaultCanvasZoom, ThemeMode } from "@/shared/preferences/preferences"

const themeModes: Array<{ value: ThemeMode; label: "跟随系统" | "浅色" | "深色" }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
]

const accentColors: Array<{
  value: AccentColor
  label: "中性灰" | "蓝色" | "绿色" | "橙色" | "紫色"
  swatch: string
}> = [
  { value: "neutral", label: "中性灰", swatch: "oklch(0.45 0 0)" },
  { value: "blue", label: "蓝色", swatch: "oklch(0.58 0.2 255)" },
  { value: "green", label: "绿色", swatch: "oklch(0.58 0.16 150)" },
  { value: "orange", label: "橙色", swatch: "oklch(0.68 0.18 55)" },
  { value: "violet", label: "紫色", swatch: "oklch(0.58 0.2 300)" },
]

const canvasZoomOptions: DefaultCanvasZoom[] = [0.8, 1, 1.2, 1.4]

export function SettingsPage() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={t("设置")}
        description={t("按照你的使用习惯调整 UFrame。设置仅保存在这台 Mac 上。")}
      />
      <PageBody>
        <div className="mx-auto grid max-w-4xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Paintbrush className="size-4" /> {t("外观")}</CardTitle>
              <CardDescription>{t("选择界面明暗模式和强调色。更改会立即生效。")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-7">
              <fieldset className="grid gap-3">
                <legend className="mb-1 flex items-center gap-2 text-sm font-medium"><SunMoon className="size-4" /> {t("外观模式")}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {themeModes.map((option) => (
                    <PreferenceButton
                      key={option.value}
                      selected={preferences.themeMode === option.value}
                      onClick={() => updatePreferences({ themeMode: option.value })}
                    >
                      {t(option.label)}
                    </PreferenceButton>
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid gap-3">
                <legend className="mb-1 text-sm font-medium">{t("主题色")}</legend>
                <div className="grid gap-2 sm:grid-cols-5">
                  {accentColors.map((option) => (
                    <PreferenceButton
                      key={option.value}
                      selected={preferences.accentColor === option.value}
                      onClick={() => updatePreferences({ accentColor: option.value })}
                    >
                      <span className="size-3 rounded-full" style={{ backgroundColor: option.swatch }} />
                      {t(option.label)}
                    </PreferenceButton>
                  ))}
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Languages className="size-4" /> {t("语言")}</CardTitle>
              <CardDescription>{t("选择整个应用界面使用的语言。")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <PreferenceButton
                selected={preferences.language === "zh-CN"}
                onClick={() => updatePreferences({ language: "zh-CN" })}
              >
                {t("简体中文")}
              </PreferenceButton>
              <PreferenceButton
                selected={preferences.language === "en-US"}
                onClick={() => updatePreferences({ language: "en-US" })}
              >
                {t("英语")}
              </PreferenceButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ScanSearch className="size-4" /> {t("机柜画布")}</CardTitle>
              <CardDescription>{t("选择打开机柜一览时使用的默认缩放比例。")}</CardDescription>
            </CardHeader>
            <CardContent>
              <fieldset className="grid gap-3">
                <legend className="sr-only">{t("默认画布缩放")}</legend>
                <div className="grid gap-2 sm:grid-cols-4">
                  {canvasZoomOptions.map((option) => (
                    <PreferenceButton
                      key={option}
                      selected={preferences.defaultCanvasZoom === option}
                      onClick={() => updatePreferences({ defaultCanvasZoom: option })}
                    >
                      {Math.round(option * 100)}%
                    </PreferenceButton>
                  ))}
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4">
            <div>
              <p className="text-sm font-medium">{t("当前设置会自动保存，不需要单独确认。")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("默认使用系统外观、中性灰主题色、简体中文和 100% 画布缩放。")}</p>
            </div>
            <Button variant="outline" onClick={resetPreferences}><RotateCcw /> {t("恢复默认设置")}</Button>
          </div>
        </div>
      </PageBody>
    </div>
  )
}

function PreferenceButton({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      className="h-10 justify-start"
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected ? <Check className="size-4" /> : <span className="size-4" />}
      {children}
    </Button>
  )
}
