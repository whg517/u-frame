import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowUpToLine, LocateFixed, Move, Pencil, Unplug } from "lucide-react"
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { DetailList } from "@/shared/components/detail-list"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { assetStatusLabel, assetTypeLabel } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { currentRoute, routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useAssets } from "@/shared/queries/assets"

export function AssetDetailPage() {
  const { assetId = "" } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const assets = useAssets()
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "/assets")
  const asset = assets.data?.find((item) => item.id === assetId)
  const unplace = useMutation({
    mutationFn: () => tauriClient.unplaceAsset({ assetId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      navigate(routeWithParams(returnTo, { highlight: null }))
    },
  })

  if (assets.isPending) return <AssetDetailState message={t("正在读取详情…")} />
  if (assets.isError) return <AssetDetailState message={errorMessage(assets.error)} error />
  if (!asset) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title={t("设备详情")} actions={<BackToAssets />} />
        <PageBody><EmptyState title={t("没有找到这个设备")} description={t("设备可能已归档，或者链接中的标识无效。")} action={<BackToAssets />} /></PageBody>
      </div>
    )
  }

  const origin = currentRoute(location.pathname, location.search)
  const editPath = routeWithParams(`/assets/${asset.id}/edit`, { returnTo: origin })
  const placementPath = routeWithParams(`/assets/${asset.id}/place`, { returnTo })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={asset.name}
        description={`${assetTypeLabel(asset.type)} · ${asset.heightU}U`}
        actions={
          <>
            <BackToAssets to={returnTo} />
            <Button variant="outline" nativeButton={false} render={<Link to={editPath} />}>
              <Pencil /> {t("编辑设备")}
            </Button>
            {asset.placement ? (
              <>
                <Button variant="outline" nativeButton={false} render={<Link to={placementPath} />}>
                  <Move /> {t("移动设备")}
                </Button>
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" />}><Unplug /> {t("下架")}</SheetTrigger>
                  <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>{t("确认下架 {name}", { name: asset.name })}</SheetTitle>
                      <SheetDescription>
                        {t("当前占用的 {placement} 将被释放，设备仍保留在资产台账中。", { placement: `${asset.placement.rackCode} · U${asset.placement.startU}–U${asset.placement.endU}` })}
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
                <Button nativeButton={false} render={<Link to={`/?area=${asset.placement.areaId}&highlight=${asset.id}`} />}>
                  <LocateFixed /> {t("在画布中定位")}
                </Button>
              </>
            ) : (
              <Button nativeButton={false} render={<Link to={placementPath} />}>
                <ArrowUpToLine /> {t("上架设备")}
              </Button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="mx-auto grid max-w-5xl gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("资产信息")}</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[
                { label: t("设备名称"), value: asset.name },
                { label: t("设备类型"), value: assetTypeLabel(asset.type) },
                { label: t("状态"), value: <Badge variant="outline">{assetStatusLabel(asset.status)}</Badge> },
                { label: t("设备高度"), value: `${asset.heightU}U` },
                { label: t("用途"), value: asset.purpose ?? "—" },
                { label: t("厂商"), value: asset.vendor ?? "—" },
                { label: t("型号"), value: asset.model ?? "—" },
                { label: t("备注"), value: asset.notes ?? "—" },
              ]} />
            </CardContent>
          </Card>
          <div className="grid content-start gap-6">
            <Card>
              <CardHeader><CardTitle>{t("网络与标识")}</CardTitle></CardHeader>
              <CardContent>
                <DetailList items={[
                  { label: t("主机名"), value: asset.hostname ?? "—" },
                  { label: t("内网 IP"), value: asset.intranetIp ?? "—" },
                  { label: t("管理 IP"), value: asset.managementIp ?? "—" },
                  { label: t("序列号"), value: asset.serialNumber ?? "—" },
                ]} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t("当前位置")}</CardTitle></CardHeader>
              <CardContent>
                {asset.placement ? (
                  <DetailList items={[
                    { label: t("机房"), value: <Link className="underline underline-offset-4" to={`/locations/rooms/${asset.placement.roomId}`}>{asset.placement.roomName}</Link> },
                    { label: t("区域"), value: <Link className="underline underline-offset-4" to={`/locations/areas/${asset.placement.areaId}`}>{asset.placement.areaName}</Link> },
                    { label: t("机柜"), value: <Link className="font-mono underline underline-offset-4" to={`/racks/${asset.placement.rackId}`}>{asset.placement.rackCode}</Link> },
                    { label: t("U 位"), value: <span className="font-mono">U{asset.placement.startU}–U{asset.placement.endU}</span> },
                  ]} />
                ) : (
                  <p className="rounded-lg bg-muted/40 px-4 py-5 text-sm text-muted-foreground">{t("设备尚未上架，当前没有机柜和 U 位。")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </div>
  )
}

function BackToAssets({ to = "/assets" }: { to?: string }) {
  return <Button variant="outline" nativeButton={false} render={<Link to={to} />}><ArrowLeft /> {t("返回")}</Button>
}

function AssetDetailState({ message, error = false }: { message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={t("设备详情")} actions={<BackToAssets />} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
