import { ArrowLeft, ArrowUpToLine, LocateFixed } from "lucide-react"
import { Link, useParams } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailList } from "@/shared/components/detail-list"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { assetStatusLabels, assetTypeLabels } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { useAssets } from "./queries"

export function AssetDetailPage() {
  const { assetId = "" } = useParams()
  const assets = useAssets()

  if (assets.isPending) return <AssetDetailState message="正在读取详情…" />
  if (assets.isError) return <AssetDetailState message={errorMessage(assets.error)} error />
  const asset = assets.data.find((item) => item.id === assetId)
  if (!asset) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="设备详情" actions={<BackToAssets />} />
        <PageBody><EmptyState title="没有找到这个设备" description="设备可能已归档，或者链接中的标识无效。" action={<BackToAssets />} /></PageBody>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Asset detail"
        title={asset.name}
        description={`${assetTypeLabels[asset.type] ?? asset.type} · ${asset.heightU}U`}
        actions={
          <>
            <BackToAssets />
            {asset.placement ? (
              <Button nativeButton={false} render={<Link to={`/?area=${asset.placement.areaId}&highlight=${asset.id}`} />}>
                <LocateFixed /> 在画布中定位
              </Button>
            ) : (
              <Button nativeButton={false} render={<Link to={`/assets/${asset.id}/place`} />}>
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

function BackToAssets() {
  return <Button variant="outline" nativeButton={false} render={<Link to="/assets" />}><ArrowLeft /> 返回设备列表</Button>
}

function AssetDetailState({ message, error = false }: { message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title="设备详情" actions={<BackToAssets />} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
