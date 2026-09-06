import { ChevronRight, Eye, MapPin, Plus } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/shared/components/empty-state"
import { PageBody, PageHeader } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { useLocations } from "./queries"

export function LocationsPage() {
  const locations = useLocations()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="位置管理"
        description="按照机房和区域组织机柜。"
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link to="/locations/areas/new" />}>
              <Plus /> 新建区域
            </Button>
            <Button nativeButton={false} render={<Link to="/locations/rooms/new" />}>
              <Plus /> 新建机房
            </Button>
          </>
        }
      />
      <PageBody>
        {locations.isPending ? (
          <p className="text-sm text-muted-foreground">正在读取位置…</p>
        ) : locations.isError ? (
          <p className="text-sm text-destructive">{errorMessage(locations.error)}</p>
        ) : locations.data.rooms.length === 0 ? (
          <EmptyState
            title="还没有机房"
            description="先创建机房，再为机房添加区域。"
            action={
              <Button nativeButton={false} render={<Link to="/locations/rooms/new" />}>
                <Plus /> 创建第一个机房
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {locations.data.rooms.map(({ room, areas }) => (
              <Card key={room.id}>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-muted">
                        <MapPin className="size-4" />
                      </div>
                      <div>
                        <CardTitle>{room.name}</CardTitle>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{room.code}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" nativeButton={false} render={<Link to={`/locations/rooms/${room.id}`} />}>
                      <Eye /> 查看
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {areas.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">暂无区域</p>
                  ) : (
                    <ul className="divide-y">
                      {areas.map((area) => (
                        <li key={area.id}>
                          <Link
                            className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/50"
                            to={`/locations/areas/${area.id}`}
                          >
                            <span className="text-sm font-medium">{area.name}</span>
                            <span className="flex items-center gap-3">
                              <span className="font-mono text-xs text-muted-foreground">{area.code}</span>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  )
}
