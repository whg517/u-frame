import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus } from "lucide-react"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
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
import { errorMessage } from "@/shared/lib/errors"
import { currentRoute, routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "@/features/locations/queries"
import { queryKeys } from "@/shared/lib/query-keys"
import { useRacks } from "./queries"

const rackSizes = [18, 22, 27, 32, 37, 42, 45, 47]
const schema = z.object({
  areaId: z.string().min(1, "请选择所属区域"),
  code: z.string().trim().min(1, "请输入机柜编码"),
  specification: z.string(),
  totalU: z.number().int().min(1, "最少为 1U").max(100, "最多为 100U"),
  powerCapacityW: z.number().min(0, "额定功率不能为负数").optional(),
  notes: z.string(),
})
type FormData = z.infer<typeof schema>

export function RackFormPage() {
  const { rackId } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const isEditing = Boolean(rackId)
  const locations = useLocations()
  const racks = useRacks()
  const rack = racks.data?.find((item) => item.id === rackId)
  const requestedAreaId = searchParams.get("areaId")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { areaId: requestedAreaId ?? "", code: "", specification: "42U", totalU: 42, notes: "" },
  })
  const returnTo = safeReturnTo(searchParams.get("returnTo"), rackId ? `/racks/${rackId}` : "/racks")
  const origin = currentRoute(location.pathname, location.search)
  const specification = useWatch({ control: form.control, name: "specification" })
  useEffect(() => {
    if (!rack) return
    form.reset({
      areaId: rack.areaId,
      code: rack.code,
      specification: rack.specification,
      totalU: rack.totalU,
      powerCapacityW: rack.powerCapacityW ?? undefined,
      notes: rack.notes ?? "",
    })
  }, [form, rack])
  useEffect(() => {
    if (
      isEditing
      || !requestedAreaId
      || !locations.data?.rooms.some(({ areas }) => areas.some((area) => area.id === requestedAreaId))
    ) return
    form.setValue("areaId", requestedAreaId, { shouldValidate: true })
  }, [form, isEditing, locations.data, requestedAreaId])
  useEffect(() => {
    if (specification !== "custom") {
      form.setValue("totalU", Number.parseInt(specification, 10), { shouldValidate: true })
    }
  }, [form, specification])
  const save = useMutation({
    mutationFn: (values: FormData) => {
      const input = {
        ...values,
        powerCapacityW: values.powerCapacityW ?? null,
        notes: values.notes || null,
      }
      return rackId
        ? tauriClient.updateRack({ rackId, ...input })
        : tauriClient.createRack(input)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.racksRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      navigate(returnTo)
    },
  })
  const areas = locations.data?.rooms.flatMap(({ room, areas }) =>
    areas.map((area) => ({ ...area, roomName: room.name })),
  ) ?? []

  if (isEditing && (locations.isPending || racks.isPending)) {
    return <RackFormState title="编辑机柜" message="正在读取机柜…" />
  }
  if (isEditing && (locations.isError || racks.isError || !rack)) {
    return <RackFormState title="编辑机柜" message={locations.isError ? errorMessage(locations.error) : racks.isError ? errorMessage(racks.error) : "没有找到这个机柜。"} error />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Rack inventory"
        title={isEditing ? "编辑机柜" : "新建机柜"}
        description={isEditing ? "修改位置、编码、规格、功率和备注。" : "选择标准规格或输入自定义 U 数。"}
      />
      <PageBody>
        {locations.isSuccess && areas.length === 0 ? (
          <EmptyState title="请先创建区域" description="机柜必须属于一个活动区域。" action={<Button nativeButton={false} render={<Link to={routeWithParams("/locations/areas/new", { returnTo: origin })} />}><Plus /> 新建区域</Button>} />
        ) : (
          <Card className="mx-auto max-w-2xl">
            <CardContent>
              <form className="space-y-5" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
                {save.isError ? <Alert variant="destructive"><AlertTitle>保存失败</AlertTitle><AlertDescription>{errorMessage(save.error)}</AlertDescription></Alert> : null}
                <FormField label="所属区域" htmlFor="areaId" error={form.formState.errors.areaId?.message}>
                  <select id="areaId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("areaId")}>
                    <option value="">请选择区域</option>
                    {areas.map((area) => <option key={area.id} value={area.id}>{area.roomName} / {area.name}</option>)}
                  </select>
                </FormField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="机柜编码" htmlFor="code" error={form.formState.errors.code?.message}>
                    <Input id="code" placeholder="例如 A-01" {...form.register("code")} />
                  </FormField>
                  <FormField label="规格" htmlFor="specification">
                    <select id="specification" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("specification")}>
                      {rackSizes.map((size) => <option key={size} value={`${size}U`}>{size}U</option>)}
                      <option value="custom">自定义</option>
                    </select>
                  </FormField>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="总 U 数" htmlFor="totalU" error={form.formState.errors.totalU?.message}>
                    <Input id="totalU" type="number" min={1} max={100} disabled={specification !== "custom"} {...form.register("totalU", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="额定功率（W）" htmlFor="powerCapacityW" error={form.formState.errors.powerCapacityW?.message}>
                    <Input id="powerCapacityW" type="number" min={0} placeholder="可选" {...form.register("powerCapacityW", { setValueAs: (value) => value === "" ? undefined : Number(value) })} />
                  </FormField>
                </div>
                <FormField label="备注" htmlFor="notes"><Textarea id="notes" placeholder="可选" {...form.register("notes")} /></FormField>
                <div className="flex justify-end gap-2 border-t pt-5">
                  <Button variant="ghost" nativeButton={false} render={<Link to={returnTo} />}><ArrowLeft /> 取消</Button>
                  <Button type="submit" disabled={save.isPending}>{save.isPending ? "正在保存…" : isEditing ? "保存修改" : "保存机柜"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </div>
  )
}

function RackFormState({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
