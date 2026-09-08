import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Boxes,
  BugPlay,
  MapPinned,
  Network,
  PanelLeft,
  Server,
  Settings,
} from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { workspaceHeaderHeightClass } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { t } from "@/shared/i18n/i18n"
import { usePreferences } from "@/shared/preferences/preferences-provider"
import { tauriClient } from "@/shared/lib/tauri-client/client"

const navigation = [
  { to: "/", label: "机柜一览" as const, icon: Boxes, end: true },
  { to: "/locations", label: "位置管理" as const, icon: MapPinned },
  { to: "/racks", label: "机柜管理" as const, icon: Network },
  { to: "/assets", label: "设备资产" as const, icon: Server },
  { to: "/settings", label: "设置" as const, icon: Settings },
]

export function AppLayout() {
  usePreferences()
  const queryClient = useQueryClient()
  const location = useLocation()
  const seed = useMutation({
    mutationFn: tauriClient.seedDevData,
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })

  return (
    <SidebarProvider defaultOpen className="h-dvh min-h-0 overflow-hidden">
      <Sidebar collapsible="none" className="h-dvh min-h-0 shrink-0 border-r">
        <SidebarHeader className={`${workspaceHeaderHeightClass} shrink-0 justify-center border-b px-4 py-0`}>
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-foreground text-xs font-semibold text-background">
              UF
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">UFrame</p>
              <p className="text-xs text-muted-foreground">{t("本地机柜管理")}</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="py-2">
          <SidebarGroup>
            <SidebarGroupLabel>{t("工作区")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ to, label, icon: Icon, end }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      render={<NavLink to={to} end={end} />}
                      isActive={end ? location.pathname === to : location.pathname.startsWith(to)}
                      className="w-full justify-start"
                    >
                      <Icon />
                      <span>{t(label)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        {import.meta.env.DEV ? (
          <SidebarFooter className="mt-auto border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              disabled={seed.isPending}
              onClick={() => seed.mutate()}
            >
              <BugPlay />
              {seed.isPending ? t("正在加载…") : t("加载开发数据")}
            </Button>
            {seed.isSuccess ? (
              <p className="px-1 text-xs text-muted-foreground">
                {seed.data.seeded ? t("开发数据已载入") : t("开发数据已存在")}
              </p>
            ) : null}
            {seed.isError ? (
              <p className="px-1 text-xs text-destructive">{errorMessage(seed.error)}</p>
            ) : null}
          </SidebarFooter>
        ) : null}
      </Sidebar>
      <SidebarInset className="h-dvh min-h-0 min-w-0 overflow-hidden bg-background">
        <div className="flex h-12 shrink-0 items-center border-b px-4 md:hidden">
          <SidebarTrigger aria-label={t("打开导航")}>
            <PanelLeft />
          </SidebarTrigger>
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
