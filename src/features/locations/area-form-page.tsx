import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/shared/components/empty-state"
import { FormField } from "@/shared/components/form-field"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { errorMessage } from "@/shared/lib/errors"
import { currentRoute, routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "./queries"

const createSchema = () => z.object({
  roomId: z.string().min(1, t("请选择所属机房")),
  code: z.string().trim().min(1, t("请输入区域编码")),
  name: z.string().trim().min(1, t("请输入区域名称")),
  description: z.string(),
})
type FormData = z.infer<ReturnType<typeof createSchema>>

export function AreaFormPage() {
  const schema = useMemo(() => createSchema(), [])
  const { areaId } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const isEditing = Boolean(areaId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locations = useLocations()
  const requestedRoomId = searchParams.get("roomId")
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roomId: requestedRoomId ?? "", code: "", name: "", description: "" },
  })
  const returnTo = safeReturnTo(searchParams.get("returnTo"), areaId ? `/locations/areas/${areaId}` : "/locations")
  const origin = currentRoute(location.pathname, location.search)
  const existing = useMemo(
    () => locations.data?.rooms
      .flatMap(({ room, areas }) => areas.map((area) => ({ area, room })))
      .find(({ area }) => area.id === areaId),
    [areaId, locations.data],
  )
  useEffect(() => {
    if (!existing) return
    form.reset({
      roomId: existing.area.roomId,
      code: existing.area.code,
      name: existing.area.name,
      description: existing.area.description ?? "",
    })
  }, [existing, form])
  useEffect(() => {
    if (
      isEditing
      || !requestedRoomId
      || !locations.data?.rooms.some(({ room }) => room.id === requestedRoomId)
    ) return
    form.setValue("roomId", requestedRoomId, { shouldValidate: true })
  }, [form, isEditing, locations.data, requestedRoomId])
  const save = useMutation({
    mutationFn: (values: FormData) => {
      const input = { ...values, description: values.description || null }
      return areaId
        ? tauriClient.updateArea({ areaId, ...input })
        : tauriClient.createArea(input)
    },
    onSuccess: async (savedArea) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.locations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.racksRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      navigate(!isEditing && returnTo.startsWith("/racks/new")
        ? routeWithParams(returnTo, { areaId: savedArea.id })
        : returnTo)
    },
  })

  if (isEditing && locations.isPending) {
    return <AreaFormState title={t("编辑区域")} message={t("正在读取区域…")} />
  }
  if (isEditing && (locations.isError || !existing)) {
    return <AreaFormState title={t("编辑区域")} message={locations.isError ? errorMessage(locations.error) : t("没有找到这个区域。")} error />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={isEditing ? t("编辑区域") : t("新建区域")}
        description={isEditing ? t("修改所属机房、编码、名称和描述。") : t("在已有机房下建立区域。")}
      />
      <PageBody>
        {locations.isSuccess && locations.data.rooms.length === 0 ? (
          <EmptyState
            title={t("请先创建机房")}
            description={t("区域必须属于一个活动机房。")}
            action={<Button nativeButton={false} render={<Link to={routeWithParams("/locations/rooms/new", { returnTo: origin })} />}><Plus /> {t("新建机房")}</Button>}
          />
        ) : (
          <Card className="mx-auto max-w-2xl">
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={form.handleSubmit((values) => save.mutate(values))}
              >
                {save.isError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("保存失败")}</AlertTitle>
                    <AlertDescription>{errorMessage(save.error)}</AlertDescription>
                  </Alert>
                ) : null}
                <FormField label={t("所属机房")} htmlFor="roomId" error={form.formState.errors.roomId?.message}>
                  <select
                    id="roomId"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    {...form.register("roomId")}
                  >
                    <option value="">{t("请选择机房")}</option>
                    {locations.data?.rooms.map(({ room }) => (
                      <option key={room.id} value={room.id}>{room.name} · {room.code}</option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label={t("区域编码")} htmlFor="code" error={form.formState.errors.code?.message}>
                    <Input id="code" placeholder={t("例如 A")} {...form.register("code")} />
                  </FormField>
                  <FormField label={t("区域名称")} htmlFor="name" error={form.formState.errors.name?.message}>
                    <Input id="name" placeholder={t("例如 A 区")} {...form.register("name")} />
                  </FormField>
                </div>
                <FormField label={t("描述")} htmlFor="description">
                  <Textarea id="description" placeholder={t("可选")} {...form.register("description")} />
                </FormField>
                <div className="flex justify-end gap-2 border-t pt-5">
                  <Button variant="ghost" nativeButton={false} render={<Link to={returnTo} />}><ArrowLeft /> {t("取消")}</Button>
                  <Button type="submit" disabled={save.isPending}>{save.isPending ? t("正在保存…") : isEditing ? t("保存修改") : t("保存区域")}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </div>
  )
}

function AreaFormState({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
