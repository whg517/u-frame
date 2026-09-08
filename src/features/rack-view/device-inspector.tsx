import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Move, Pencil, Unplug, X } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { t } from "@/shared/i18n/i18n"
import { assetStatusLabel, assetTypeLabel } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { routeWithParams } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import type { RackDto, RackPlacementViewDto } from "@/shared/lib/tauri-client/bindings"
import { tauriClient } from "@/shared/lib/tauri-client/client"

export function DeviceInspector({
  placement,
  rack,
  onClose,
  returnTo,
}: {
  placement: RackPlacementViewDto
  rack: RackDto
  onClose: () => void
  returnTo: string
}) {
  const queryClient = useQueryClient()
  const unplace = useMutation({
    mutationFn: () => tauriClient.unplaceAsset({ assetId: placement.assetId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      onClose()
    },
  })
  const editPath = routeWithParams(`/assets/${placement.assetId}/edit`, { returnTo })
  const movePath = routeWithParams(`/assets/${placement.assetId}/place`, { returnTo })
  const detailPath = routeWithParams(`/assets/${placement.assetId}`, { returnTo })
  const rows = [
    [t("类型"), assetTypeLabel(placement.type)],
    [t("状态"), assetStatusLabel(placement.status)],
    [t("位置"), `${rack.roomName} / ${rack.areaName}`],
    [t("机柜"), rack.code],
    [t("U 位"), `U${placement.startU}–U${placement.endU}`],
    [t("高度"), `${placement.heightU}U`],
    [t("主机名"), placement.hostname ?? "—"],
    [t("内网 IP"), placement.intranetIp ?? "—"],
    [t("序列号"), placement.serialNumber ?? "—"],
    [t("厂商 / 型号"), [placement.vendor, placement.model].filter(Boolean).join(" ") || "—"],
  ]
  return (
    <aside className="w-72 shrink-0 overflow-auto border-l bg-background p-5" aria-label={t("设备详情")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline">{t("设备详情")}</Badge>
          <h2 className="mt-3 font-semibold">{placement.name}</h2>
          {placement.purpose ? <p className="mt-1 text-xs text-muted-foreground">{placement.purpose}</p> : null}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t("关闭设备详情")} onClick={onClose}><X /></Button>
      </div>
      <dl className="mt-6 divide-y border-y text-sm">
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[82px_1fr] gap-3 py-3" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" nativeButton={false} render={<Link to={editPath} />}>
          <Pencil /> {t("编辑")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link to={movePath} />}>
          <Move /> {t("移动")}
        </Button>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}><Unplug /> {t("下架")}</SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t("确认下架 {name}", { name: placement.name })}</SheetTitle>
              <SheetDescription>
                {t("当前占用的 {placement} 将被释放，设备仍保留在资产台账中。", { placement: `${rack.code} · U${placement.startU}–U${placement.endU}` })}
              </SheetDescription>
            </SheetHeader>
            {unplace.isError ? <p className="px-4 text-sm text-destructive">{errorMessage(unplace.error)}</p> : null}
            <SheetFooter>
              <Button variant="destructive" disabled={unplace.isPending} onClick={() => unplace.mutate()}>
                {unplace.isPending ? t("正在下架…") : t("确认下架")}
              </Button>
              <SheetClose render={<Button variant="outline" />}>{t("取消")}</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Button variant="outline" nativeButton={false} render={<Link to={detailPath} />}>
          {t("完整详情")} <ExternalLink />
        </Button>
      </div>
    </aside>
  )
}
