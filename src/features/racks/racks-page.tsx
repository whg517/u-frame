import { Eye, Plus } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { errorMessage } from "@/shared/lib/errors"
import { useRacks } from "@/shared/queries/racks"

export function RacksPage() {
  const racks = useRacks()
  const navigate = useNavigate()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={t("机柜管理")}
        description={t("维护机柜规格和所属物理位置。")}
        actions={<Button nativeButton={false} render={<Link to="/racks/new" />}><Plus /> {t("新建机柜")}</Button>}
      />
      <PageBody>
        {racks.isPending ? (
          <p className="text-sm text-muted-foreground">{t("正在读取机柜…")}</p>
        ) : racks.isError ? (
          <p className="text-sm text-destructive">{errorMessage(racks.error)}</p>
        ) : racks.data.length === 0 ? (
          <EmptyState
            title={t("还没有机柜")}
            description={t("先准备机房和区域，然后创建第一个机柜。")}
            action={<Button nativeButton={false} render={<Link to="/racks/new" />}><Plus /> {t("创建机柜")}</Button>}
          />
        ) : (
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("机柜")}</TableHead>
                  <TableHead>{t("规格")}</TableHead>
                  <TableHead>{t("位置")}</TableHead>
                  <TableHead>{t("额定功率")}</TableHead>
                  <TableHead>{t("状态")}</TableHead>
                  <TableHead className="text-right">{t("操作")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {racks.data.map((rack) => (
                  <TableRow
                    key={rack.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    aria-label={t("查看机柜 {code}", { code: rack.code })}
                    onClick={() => navigate(`/racks/${rack.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") navigate(`/racks/${rack.id}`)
                    }}
                  >
                    <TableCell className="font-mono font-medium">{rack.code}</TableCell>
                    <TableCell>{rack.specification === "custom" ? t("{totalU}U 自定义", { totalU: rack.totalU }) : rack.specification}</TableCell>
                    <TableCell>{rack.roomName} / {rack.areaName}</TableCell>
                    <TableCell>{rack.powerCapacityW ? `${rack.powerCapacityW} W` : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{t("活动")}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button size="sm" variant="ghost" nativeButton={false} render={<Link to={`/racks/${rack.id}`} />}>
                        <Eye /> {t("查看")}
                      </Button>
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
