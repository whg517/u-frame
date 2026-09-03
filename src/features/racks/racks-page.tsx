import { Plus } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { useRacks } from "./queries"

export function RacksPage() {
  const racks = useRacks()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Rack inventory"
        title="机柜管理"
        description="维护机柜规格和所属物理位置。"
        actions={<Button nativeButton={false} render={<Link to="/racks/new" />}><Plus /> 新建机柜</Button>}
      />
      <PageBody>
        {racks.isPending ? (
          <p className="text-sm text-muted-foreground">正在读取机柜…</p>
        ) : racks.isError ? (
          <p className="text-sm text-destructive">{errorMessage(racks.error)}</p>
        ) : racks.data.length === 0 ? (
          <EmptyState
            title="还没有机柜"
            description="先准备机房和区域，然后创建第一个机柜。"
            action={<Button nativeButton={false} render={<Link to="/racks/new" />}><Plus /> 创建机柜</Button>}
          />
        ) : (
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>机柜</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>额定功率</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {racks.data.map((rack) => (
                  <TableRow key={rack.id}>
                    <TableCell className="font-mono font-medium">{rack.code}</TableCell>
                    <TableCell>{rack.specification === "custom" ? `${rack.totalU}U 自定义` : rack.specification}</TableCell>
                    <TableCell>{rack.roomName} / {rack.areaName}</TableCell>
                    <TableCell>{rack.powerCapacityW ? `${rack.powerCapacityW} W` : "—"}</TableCell>
                    <TableCell><Badge variant="outline">活动</Badge></TableCell>
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
