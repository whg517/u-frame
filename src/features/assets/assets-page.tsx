import { ArrowUpToLine, Eye, Plus } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { assetStatusLabels, assetTypeLabels } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { useAssets } from "./queries"

export function AssetsPage() {
  const assets = useAssets()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Physical assets"
        title="设备资产"
        description="管理服务器和网络设备，并记录当前上架位置。"
        actions={<Button nativeButton={false} render={<Link to="/assets/new" />}><Plus /> 新建设备</Button>}
      />
      <PageBody>
        {assets.isPending ? (
          <p className="text-sm text-muted-foreground">正在读取设备…</p>
        ) : assets.isError ? (
          <p className="text-sm text-destructive">{errorMessage(assets.error)}</p>
        ) : assets.data.length === 0 ? (
          <EmptyState title="还没有设备" description="设备可以先录入台账，之后再选择机柜和 U 位上架。" action={<Button nativeButton={false} render={<Link to="/assets/new" />}><Plus /> 创建设备</Button>} />
        ) : (
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>高度</TableHead>
                  <TableHead>当前位置</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.data.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <p className="font-medium">{asset.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{asset.hostname ?? asset.intranetIp ?? "—"}</p>
                    </TableCell>
                    <TableCell>{assetTypeLabels[asset.type] ?? asset.type}</TableCell>
                    <TableCell><Badge variant="outline">{assetStatusLabels[asset.status] ?? asset.status}</Badge></TableCell>
                    <TableCell>{asset.heightU}U</TableCell>
                    <TableCell>
                      {asset.placement ? `${asset.placement.rackCode} · U${asset.placement.startU}–U${asset.placement.endU}` : <span className="text-muted-foreground">未上架</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" nativeButton={false} render={<Link to={`/assets/${asset.id}`} />}>
                          <Eye /> 查看
                        </Button>
                        {!asset.placement ? (
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link to={`/assets/${asset.id}/place`} />}>
                          <ArrowUpToLine /> 上架
                        </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageBody>
    </div>
  )
}
