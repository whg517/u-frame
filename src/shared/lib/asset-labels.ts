import { t, type MessageKey } from "@/shared/i18n/i18n"

const assetTypeLabels: Record<string, MessageKey> = {
  server: "服务器",
  switch: "交换机",
  router: "路由器",
  firewall: "防火墙",
}

const assetStatusLabels: Record<string, MessageKey> = {
  active: "运行中",
  maintenance: "维护中",
  offline: "离线",
}

export function assetTypeLabel(type: string) {
  const label = assetTypeLabels[type]
  return label ? t(label) : type
}

export function assetStatusLabel(status: string) {
  const label = assetStatusLabels[status]
  return label ? t(label) : status
}
