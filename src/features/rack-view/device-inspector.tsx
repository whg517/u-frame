import { ExternalLink, X } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { assetStatusLabels, assetTypeLabels } from "@/shared/lib/asset-labels"
import type { RackDto, RackPlacementViewDto } from "@/shared/lib/tauri-client/bindings"

export function DeviceInspector({
  placement,
  rack,
  onClose,
}: {
  placement: RackPlacementViewDto
  rack: RackDto
  onClose: () => void
}) {
  const rows = [
    ["类型", assetTypeLabels[placement.type] ?? placement.type],
    ["状态", assetStatusLabels[placement.status] ?? placement.status],
    ["位置", `${rack.roomName} / ${rack.areaName}`],
    ["机柜", rack.code],
    ["U 位", `U${placement.startU}–U${placement.endU}`],
    ["高度", `${placement.heightU}U`],
    ["主机名", placement.hostname ?? "—"],
    ["内网 IP", placement.intranetIp ?? "—"],
    ["序列号", placement.serialNumber ?? "—"],
    ["厂商 / 型号", [placement.vendor, placement.model].filter(Boolean).join(" ") || "—"],
  ]
  return (
    <aside className="w-72 shrink-0 overflow-auto border-l bg-background p-5" aria-label="设备详情">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline">设备详情</Badge>
          <h2 className="mt-3 font-semibold">{placement.name}</h2>
          {placement.purpose ? <p className="mt-1 text-xs text-muted-foreground">{placement.purpose}</p> : null}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="关闭设备详情" onClick={onClose}><X /></Button>
      </div>
      <dl className="mt-6 divide-y border-y text-sm">
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[82px_1fr] gap-3 py-3" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <Button
        className="mt-5 w-full"
        variant="outline"
        nativeButton={false}
        render={<Link to={`/assets/${placement.assetId}`} />}
      >
        查看完整详情 <ExternalLink />
      </Button>
    </aside>
  )
}
