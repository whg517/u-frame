import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, ChevronRight, LocateFixed, MapPin, Pencil, Plus } from "lucide-react"
import { Link, useLocation, useParams, useSearchParams } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailList, DetailMetric } from "@/shared/components/detail-list"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { currentRoute, routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "./queries"

function BackToLocations({ to = "/locations", label = "返回" }: { to?: string; label?: string }) {
  return (
    <Button variant="outline" nativeButton={false} render={<Link to={to} />}>
      <ArrowLeft /> {label}
    </Button>
  )
}

function LocationNotFound({ title }: { title: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={title} actions={<BackToLocations />} />
      <PageBody>
        <EmptyState
          title="没有找到这个位置"
          description="位置可能已归档，或者链接中的标识无效。"
          action={<BackToLocations />}
        />
      </PageBody>
    </div>
  )
}

export function RoomDetailPage() {
  const { roomId = "" } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const locations = useLocations()
  const racks = useQuery({
    queryKey: queryKeys.racksRoot,
    queryFn: () => tauriClient.listRacks(),
  })

  if (locations.isPending || racks.isPending) {
    return <DetailLoading title="机房详情" />
  }
  if (locations.isError || racks.isError) {
    return <DetailError title="机房详情" error={locations.error ?? racks.error} />
  }

  const node = locations.data.rooms.find(({ room }) => room.id === roomId)
  if (!node) return <LocationNotFound title="机房详情" />
  const roomRacks = racks.data.filter((rack) => rack.roomId === roomId)
  const origin = currentRoute(location.pathname, location.search)
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "/locations")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={node.room.name}
        description={`机房编码 ${node.room.code}`}
        actions={
          <>
            <BackToLocations to={returnTo} />
            <Button variant="outline" nativeButton={false} render={<Link to={routeWithParams("/locations/areas/new", { roomId: node.room.id, returnTo: origin })} />}>
              <Plus /> 新增区域
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to={`/?room=${encodeURIComponent(node.room.id)}`} />}>
              <LocateFixed /> 查看机柜
            </Button>
            <Button nativeButton={false} render={<Link to={`/locations/rooms/${node.room.id}/edit`} />}>
              <Pencil /> 编辑机房
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mx-auto grid max-w-5xl gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailMetric label="区域数量" value={node.areas.length} description="当前活动区域" />
            <DetailMetric label="机柜数量" value={roomRacks.length} description="所有区域中的活动机柜" />
          </div>
          <Card>
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[
                { label: "机房名称", value: node.room.name },
                { label: "机房编码", value: <span className="font-mono">{node.room.code}</span> },
                { label: "状态", value: <Badge variant="outline">活动</Badge> },
                { label: "描述", value: node.room.description ?? "—" },
              ]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>区域</CardTitle></CardHeader>
            <CardContent className="p-0">
              {node.areas.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">该机房还没有区域。</p>
              ) : (
                <ul className="divide-y">
                  {node.areas.map((area) => (
                    <li key={area.id}>
                      <Link
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
                        to={routeWithParams(`/locations/areas/${area.id}`, { returnTo: origin })}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                            <MapPin className="size-4" />
                          </span>
                          <span>
                            <span className="block font-medium">{area.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{area.code}</span>
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  )
}

export function AreaDetailPage() {
  const { areaId = "" } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const locations = useLocations()
  const racks = useQuery({
    queryKey: queryKeys.racks(areaId),
    queryFn: () => tauriClient.listRacks(areaId),
  })

  if (locations.isPending || racks.isPending) return <DetailLoading title="区域详情" />
  if (locations.isError || racks.isError) {
    return <DetailError title="区域详情" error={locations.error ?? racks.error} />
  }

  const roomNode = locations.data.rooms.find(({ areas }) => areas.some((area) => area.id === areaId))
  const area = roomNode?.areas.find((item) => item.id === areaId)
  if (!roomNode || !area) return <LocationNotFound title="区域详情" />
  const totalU = racks.data.reduce((sum, rack) => sum + rack.totalU, 0)
  const origin = currentRoute(location.pathname, location.search)
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "/locations")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={area.name}
        description={`${roomNode.room.name} / ${area.code}`}
        actions={
          <>
            <BackToLocations to={returnTo} />
            <Button variant="outline" nativeButton={false} render={<Link to={routeWithParams("/racks/new", { areaId: area.id, returnTo: origin })} />}>
              <Plus /> 新增机柜
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to={`/?area=${encodeURIComponent(area.id)}`} />}>
              <LocateFixed /> 查看画布
            </Button>
            <Button nativeButton={false} render={<Link to={`/locations/areas/${area.id}/edit`} />}>
              <Pencil /> 编辑区域
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mx-auto grid max-w-5xl gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailMetric label="机柜数量" value={racks.data.length} description="当前活动机柜" />
            <DetailMetric label="总容量" value={`${totalU}U`} description="按机柜总 U 数汇总" />
          </div>
          <Card>
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[
                { label: "区域名称", value: area.name },
                { label: "区域编码", value: <span className="font-mono">{area.code}</span> },
                { label: "所属机房", value: <Link className="underline underline-offset-4" to={`/locations/rooms/${roomNode.room.id}`}>{roomNode.room.name}</Link> },
                { label: "状态", value: <Badge variant="outline">活动</Badge> },
                { label: "描述", value: area.description ?? "—" },
              ]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>机柜</CardTitle></CardHeader>
            <CardContent className="p-0">
              {racks.data.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">该区域还没有机柜。</p>
              ) : (
                <ul className="divide-y">
                  {racks.data.map((rack) => (
                    <li key={rack.id}>
                      <Link className="flex items-center justify-between px-4 py-3 hover:bg-muted/50" to={routeWithParams(`/racks/${rack.id}`, { returnTo: origin })}>
                        <span>
                          <span className="block font-mono font-medium">{rack.code}</span>
                          <span className="text-xs text-muted-foreground">
                            {rack.specification === "custom"
                              ? `${rack.totalU}U 自定义`
                              : rack.specification}
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  )
}

function DetailLoading({ title }: { title: string }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} /><PageBody><p className="text-sm text-muted-foreground">正在读取详情…</p></PageBody></div>
}

function DetailError({ title, error }: { title: string; error: unknown }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} actions={<BackToLocations />} /><PageBody><p className="text-sm text-destructive">{errorMessage(error)}</p></PageBody></div>
}
