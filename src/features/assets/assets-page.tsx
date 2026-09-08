import { ArrowLeft, ArrowUpToLine, Eye, Plus, Search, X } from "lucide-react"
import { useMemo } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { assetStatusLabel, assetTypeLabel } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { currentRoute, routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { useRacks } from "@/features/racks/queries"
import { useAssets } from "./queries"

export function AssetsPage() {
  const assets = useAssets()
  const racks = useRacks()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get("q") ?? ""
  const type = searchParams.get("type") ?? "all"
  const status = searchParams.get("status") ?? "all"
  const placement = searchParams.get("placement") ?? "all"
  const rackId = searchParams.get("rackId")
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "/assets")
  const origin = currentRoute(location.pathname, location.search)
  const targetRack = racks.data?.find((rack) => rack.id === rackId)
  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return (assets.data ?? []).filter((asset) => {
      const searchable = [asset.name, asset.hostname, asset.intranetIp, asset.managementIp, asset.serialNumber, asset.vendor, asset.model]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (type === "all" || asset.type === type)
        && (status === "all" || asset.status === status)
        && (placement === "all" || (placement === "placed" ? Boolean(asset.placement) : !asset.placement))
    })
  }, [assets.data, placement, query, status, type])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (!value || value === "all") next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)
    for (const key of ["q", "type", "status", "placement"]) next.delete(key)
    if (targetRack) next.set("placement", "unplaced")
    setSearchParams(next, { replace: true })
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={targetRack ? t("选择设备上架到 {code}", { code: targetRack.code }) : t("设备资产")}
        description={targetRack ? t("{roomName} / {areaName} · 仅显示符合当前筛选的设备。", { roomName: targetRack.roomName, areaName: targetRack.areaName }) : t("管理服务器和网络设备，并记录当前上架位置。")}
        actions={
          <>
            {targetRack ? <Button variant="outline" nativeButton={false} render={<Link to={returnTo} />}><ArrowLeft /> {t("返回机柜")}</Button> : null}
            <Button nativeButton={false} render={<Link to={routeWithParams("/assets/new", { rackId, returnTo: targetRack ? returnTo : origin })} />}><Plus /> {t("新建设备")}</Button>
          </>
        }
      />
      <PageBody>
        {assets.isPending ? (
          <p className="text-sm text-muted-foreground">{t("正在读取设备…")}</p>
        ) : assets.isError ? (
          <p className="text-sm text-destructive">{errorMessage(assets.error)}</p>
        ) : assets.data.length === 0 ? (
          <EmptyState title={t("还没有设备")} description={t("设备可以先录入台账，之后再选择机柜和 U 位上架。")} action={<Button nativeButton={false} render={<Link to={routeWithParams("/assets/new", { rackId, returnTo: targetRack ? returnTo : origin })} />}><Plus /> {t("创建设备")}</Button>} />
        ) : (
          <div className="space-y-4">
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-64 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label={t("搜索设备")}
                    className="pl-8"
                    placeholder={t("搜索名称、主机名、IP、SN、厂商或型号")}
                    value={query}
                    onChange={(event) => updateFilter("q", event.target.value)}
                  />
                </label>
                <select aria-label={t("设备类型筛选")} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" value={type} onChange={(event) => updateFilter("type", event.target.value)}>
                  <option value="all">{t("全部类型")}</option><option value="server">{assetTypeLabel("server")}</option><option value="switch">{assetTypeLabel("switch")}</option><option value="router">{assetTypeLabel("router")}</option><option value="firewall">{assetTypeLabel("firewall")}</option>
                </select>
                <select aria-label={t("设备状态筛选")} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" value={status} onChange={(event) => updateFilter("status", event.target.value)}>
                  <option value="all">{t("全部状态")}</option><option value="active">{assetStatusLabel("active")}</option><option value="maintenance">{assetStatusLabel("maintenance")}</option><option value="offline">{assetStatusLabel("offline")}</option>
                </select>
                <select aria-label={t("上架状态筛选")} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" value={placement} onChange={(event) => updateFilter("placement", event.target.value)}>
                  <option value="all">{t("全部位置")}</option><option value="placed">{t("已上架")}</option><option value="unplaced">{t("未上架")}</option>
                </select>
                {query || type !== "all" || status !== "all" || placement !== "all" ? (
                  <Button size="sm" variant="ghost" onClick={clearFilters}><X /> {t("清除")}</Button>
                ) : null}
              </div>
            </Card>
            {filteredAssets.length === 0 ? (
              <EmptyState title={t("没有匹配的设备")} description={t("调整搜索词或筛选条件后再试。")} action={<Button variant="outline" onClick={clearFilters}>{t("清除筛选")}</Button>} />
            ) : <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("设备")}</TableHead>
                  <TableHead>{t("类型")}</TableHead>
                  <TableHead>{t("状态")}</TableHead>
                  <TableHead>{t("高度")}</TableHead>
                  <TableHead>{t("当前位置")}</TableHead>
                  <TableHead className="text-right">{t("操作")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const detailPath = routeWithParams(`/assets/${asset.id}`, { returnTo: origin })
                  const placePath = routeWithParams(`/assets/${asset.id}/place`, {
                    rackId,
                    returnTo: targetRack ? returnTo : origin,
                  })
                  return (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    aria-label={t("查看设备 {name}", { name: asset.name })}
                    onClick={() => navigate(detailPath)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") navigate(detailPath)
                    }}
                  >
                    <TableCell>
                      <p className="font-medium">{asset.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{asset.hostname ?? asset.intranetIp ?? "—"}</p>
                    </TableCell>
                    <TableCell>{assetTypeLabel(asset.type)}</TableCell>
                    <TableCell><Badge variant="outline">{assetStatusLabel(asset.status)}</Badge></TableCell>
                    <TableCell>{asset.heightU}U</TableCell>
                    <TableCell>
                      {asset.placement ? `${asset.placement.rackCode} · U${asset.placement.startU}–U${asset.placement.endU}` : <span className="text-muted-foreground">{t("未上架")}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" variant="ghost" nativeButton={false} render={<Link to={detailPath} />}>
                          <Eye /> {t("详情")}
                        </Button>
                        {!asset.placement ? (
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link to={placePath} />}>
                          <ArrowUpToLine /> {targetRack ? t("上架到 {code}", { code: targetRack.code }) : t("上架")}
                        </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </Card>}
          </div>
        )}
      </PageBody>
    </div>
  )
}
