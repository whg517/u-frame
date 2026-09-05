import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Boxes, LocateFixed, Pencil } from "lucide-react"
import { Link, useParams } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DetailList, DetailMetric } from "@/shared/components/detail-list"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { assetStatusLabels, assetTypeLabels } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"

export function RackDetailPage() {
  const { rackId = "" } = useParams()
  const view = useQuery({
    queryKey: queryKeys.rackView(null),
    queryFn: () => tauriClient.getRackView(),
  })

  if (view.isPending) return <RackDetailState title="机柜详情" message="正在读取详情…" />
  if (view.isError) return <RackDetailState title="机柜详情" message={errorMessage(view.error)} error />
  const canvas = view.data.racks.find(({ rack }) => rack.id === rackId)
  if (!canvas) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="机柜详情" actions={<BackToRacks />} />
        <PageBody><EmptyState title="没有找到这个机柜" description="机柜可能已归档，或者链接中的标识无效。" action={<BackToRacks />} /></PageBody>
      </div>
    )
  }

  const { rack, placements } = canvas
  const occupiedU = placements.reduce((sum, placement) => sum + placement.heightU, 0)
  const availableU = rack.totalU - occupiedU
  const occupancy = Math.round((occupiedU / rack.totalU) * 100)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Rack detail"
        title={rack.code}
        description={`${rack.roomName} / ${rack.areaName}`}
        actions={
          <>
            <BackToRacks />
            <Button variant="outline" nativeButton={false} render={<Link to={`/racks/${rack.id}/edit`} />}>
              <Pencil /> 编辑机柜
            </Button>
            <Button nativeButton={false} render={<Link to={`/?area=${rack.areaId}`} />}>
              <LocateFixed /> 在画布中查看
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mx-auto grid max-w-6xl gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailMetric label="设备数量" value={placements.length} description="当前已上架设备" />
            <DetailMetric label="已占用" value={`${occupiedU}U`} />
            <DetailMetric label="可用容量" value={`${availableU}U`} />
            <DetailMetric label="占用率" value={`${occupancy}%`} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
              <CardContent>
                <DetailList items={[
                  { label: "机柜编码", value: <span className="font-mono">{rack.code}</span> },
                  { label: "所属位置", value: <Link className="underline underline-offset-4" to={`/locations/areas/${rack.areaId}`}>{rack.roomName} / {rack.areaName}</Link> },
                  { label: "规格", value: rack.specification === "custom" ? `${rack.totalU}U 自定义` : rack.specification },
                  { label: "总 U 数", value: `${rack.totalU}U` },
                  { label: "额定功率", value: rack.powerCapacityW === null ? "—" : `${rack.powerCapacityW} W` },
                  { label: "状态", value: <Badge variant="outline">活动</Badge> },
                  { label: "备注", value: rack.notes ?? "—" },
                ]} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="size-4" /> 已上架设备</CardTitle></CardHeader>
              <CardContent className="p-0">
                {placements.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">该机柜当前没有设备。</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>设备</TableHead><TableHead>类型</TableHead><TableHead>状态</TableHead><TableHead>U 位</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {placements.map((placement) => (
                        <TableRow key={placement.placementId}>
                          <TableCell><Link className="font-medium underline-offset-4 hover:underline" to={`/assets/${placement.assetId}`}>{placement.name}</Link></TableCell>
                          <TableCell>{assetTypeLabels[placement.type] ?? placement.type}</TableCell>
                          <TableCell>{assetStatusLabels[placement.status] ?? placement.status}</TableCell>
                          <TableCell className="font-mono">U{placement.startU}–U{placement.endU}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </div>
  )
}

function BackToRacks() {
  return <Button variant="outline" nativeButton={false} render={<Link to="/racks" />}><ArrowLeft /> 返回机柜列表</Button>
}

function RackDetailState({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} actions={<BackToRacks />} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
