import { englishMessages, type MessageKey } from "./messages"

export type { MessageKey } from "./messages"

export type AppLanguage = "zh-CN" | "en-US"

let activeLanguage: AppLanguage = "zh-CN"

export function setActiveLanguage(language: AppLanguage) {
  activeLanguage = language
}

export function getActiveLanguage() {
  return activeLanguage
}

export function t(key: MessageKey, values: Record<string, string | number> = {}) {
  const template = activeLanguage === "en-US" ? englishMessages[key] : key
  return Object.entries(values).reduce(
    (message, [name, value]) => message.split(`{${name}}`).join(String(value)),
    template as string,
  )
}
