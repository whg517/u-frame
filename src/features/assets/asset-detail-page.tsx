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
import { assetStatusLabels, assetTypeLabels } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { currentRoute, routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useAssets } from "./queries"

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

  if (assets.isPending) return <AssetDetailState message="正在读取详情…" />
  if (assets.isError) return <AssetDetailState message={errorMessage(assets.error)} error />
  if (!asset) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="设备详情" actions={<BackToAssets />} />
        <PageBody><EmptyState title="没有找到这个设备" description="设备可能已归档，或者链接中的标识无效。" action={<BackToAssets />} /></PageBody>
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
        description={`${assetTypeLabels[asset.type] ?? asset.type} · ${asset.heightU}U`}
        actions={
          <>
            <BackToAssets to={returnTo} />
            <Button variant="outline" nativeButton={false} render={<Link to={editPath} />}>
              <Pencil /> 编辑设备
            </Button>
            {asset.placement ? (
              <>
                <Button variant="outline" nativeButton={false} render={<Link to={placementPath} />}>
                  <Move /> 移动设备
                </Button>
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" />}><Unplug /> 下架</SheetTrigger>
                  <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>确认下架 {asset.name}</SheetTitle>
                      <SheetDescription>
                        当前占用的 {asset.placement.rackCode} · U{asset.placement.startU}–U{asset.placement.endU} 将被释放，设备仍保留在资产台账中。
                      </SheetDescription>
                    </SheetHeader>
                    {unplace.isError ? <p className="px-4 text-sm text-destructive">{errorMessage(unplace.error)}</p> : null}
                    <SheetFooter>
                      <Button variant="destructive" disabled={unplace.isPending} onClick={() => unplace.mutate()}>
                        {unplace.isPending ? "正在下架…" : "确认下架"}
                      </Button>
                      <SheetClose render={<Button variant="outline" />}>取消</SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
                <Button nativeButton={false} render={<Link to={`/?area=${asset.placement.areaId}&highlight=${asset.id}`} />}>
                  <LocateFixed /> 在画布中定位
                </Button>
              </>
            ) : (
              <Button nativeButton={false} render={<Link to={placementPath} />}>
                <ArrowUpToLine /> 上架设备
              </Button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="mx-auto grid max-w-5xl gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>资产信息</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[
                { label: "设备名称", value: asset.name },
                { label: "设备类型", value: assetTypeLabels[asset.type] ?? asset.type },
                { label: "状态", value: <Badge variant="outline">{assetStatusLabels[asset.status] ?? asset.status}</Badge> },
                { label: "设备高度", value: `${asset.heightU}U` },
                { label: "用途", value: asset.purpose ?? "—" },
                { label: "厂商", value: asset.vendor ?? "—" },
                { label: "型号", value: asset.model ?? "—" },
                { label: "备注", value: asset.notes ?? "—" },
              ]} />
            </CardContent>
          </Card>
          <div className="grid content-start gap-6">
            <Card>
              <CardHeader><CardTitle>网络与标识</CardTitle></CardHeader>
              <CardContent>
                <DetailList items={[
                  { label: "主机名", value: asset.hostname ?? "—" },
                  { label: "内网 IP", value: asset.intranetIp ?? "—" },
                  { label: "管理 IP", value: asset.managementIp ?? "—" },
                  { label: "序列号", value: asset.serialNumber ?? "—" },
                ]} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>当前位置</CardTitle></CardHeader>
              <CardContent>
                {asset.placement ? (
                  <DetailList items={[
                    { label: "机房", value: <Link className="underline underline-offset-4" to={`/locations/rooms/${asset.placement.roomId}`}>{asset.placement.roomName}</Link> },
                    { label: "区域", value: <Link className="underline underline-offset-4" to={`/locations/areas/${asset.placement.areaId}`}>{asset.placement.areaName}</Link> },
                    { label: "机柜", value: <Link className="font-mono underline underline-offset-4" to={`/racks/${asset.placement.rackId}`}>{asset.placement.rackCode}</Link> },
                    { label: "U 位", value: <span className="font-mono">U{asset.placement.startU}–U{asset.placement.endU}</span> },
                  ]} />
                ) : (
                  <p className="rounded-lg bg-muted/40 px-4 py-5 text-sm text-muted-foreground">设备尚未上架，当前没有机柜和 U 位。</p>
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
  return <Button variant="outline" nativeButton={false} render={<Link to={to} />}><ArrowLeft /> 返回</Button>
}

function AssetDetailState({ message, error = false }: { message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title="设备详情" actions={<BackToAssets />} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
