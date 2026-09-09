import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/shared/components/empty-state"
import { FormField } from "@/shared/components/form-field"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { errorMessage } from "@/shared/lib/errors"
import { routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useRacks } from "@/shared/queries/racks"
import { useAssets } from "@/shared/queries/assets"
import { availableRanges, conflictingPlacement } from "./placement-options"

const createSchema = () => z.object({
  rackId: z.string().min(1, t("请选择目标机柜")),
  startU: z.number().int().min(1, t("起始位置不能低于 U1")),
})
type FormData = z.infer<ReturnType<typeof createSchema>>

export function PlacementFormPage() {
  const schema = useMemo(() => createSchema(), [])
  const { assetId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const assets = useAssets()
  const racks = useRacks()
  const view = useQuery({
    queryKey: queryKeys.rackView(null),
    queryFn: () => tauriClient.getRackView(),
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { rackId: "", startU: 1 } })
  const initialized = useRef(false)
  const rackId = useWatch({ control: form.control, name: "rackId" })
  const selectedRack = racks.data?.find((rack) => rack.id === rackId)
  const asset = assets.data?.find((item) => item.id === assetId)
  const isMoving = Boolean(asset?.placement)
  const returnTo = safeReturnTo(searchParams.get("returnTo"), asset ? `/assets/${asset.id}` : "/assets")
  useEffect(() => {
    if (!asset || initialized.current) return
    const requestedRackId = searchParams.get("rackId")
    const initialRackId = requestedRackId ?? asset.placement?.rackId ?? ""
    const initialStartU = requestedRackId && requestedRackId !== asset.placement?.rackId
      ? 1
      : asset.placement?.startU ?? 1
    form.reset({ rackId: initialRackId, startU: initialStartU })
    initialized.current = true
  }, [asset, form, searchParams])
  const startU = useWatch({ control: form.control, name: "startU" })
  const endU = asset ? startU + asset.heightU - 1 : startU
  const rackCanvas = view.data?.racks.find(({ rack }) => rack.id === rackId)
  const ranges = asset && rackCanvas
    ? availableRanges(rackCanvas.rack.totalU, asset.heightU, rackCanvas.placements, isMoving ? asset.id : undefined)
    : []
  const conflict = rackCanvas
    ? conflictingPlacement(startU, endU, rackCanvas.placements, isMoving ? asset?.id : undefined)
    : null
  const outOfRange = Boolean(selectedRack && (startU < 1 || endU > selectedRack.totalU))
  const unchanged = Boolean(
    asset?.placement
    && asset.placement.rackId === rackId
    && asset.placement.startU === startU,
  )
  const place = useMutation({
    mutationFn: (values: FormData) => isMoving
      ? tauriClient.moveAsset({ assetId, ...values })
      : tauriClient.placeAsset({ assetId, ...values }),
    onSuccess: async (placement) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      const rack = racks.data?.find((item) => item.id === placement.rackId)
      const destination = returnTo === "/" || returnTo.startsWith("/?")
        ? routeWithParams(returnTo, { area: rack?.areaId, highlight: placement.assetId })
        : returnTo
      navigate(destination)
    },
  })

  if (assets.isSuccess && !asset) {
    return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={t("设备上架")} /><PageBody><EmptyState title={t("没有找到设备")} description={t("设备可能已不存在。")} action={<Button nativeButton={false} render={<Link to="/assets" />}>{t("返回设备列表")}</Button>} /></PageBody></div>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={isMoving ? t("移动设备") : t("设备上架")}
        description={t("选择目标机柜和最低占用 U 位；可用连续空间会随目标机柜更新。")}
      />
      <PageBody>
        <Card className="mx-auto max-w-2xl">
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit((values) => place.mutate(values))}>
              {place.isError ? <Alert variant="destructive"><AlertTitle>{isMoving ? t("移动失败") : t("上架失败")}</AlertTitle><AlertDescription>{errorMessage(place.error)}</AlertDescription></Alert> : null}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">{asset?.name ?? t("正在读取设备…")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("设备高度 {height}U", { height: asset?.heightU ?? "—" })}</p>
                {asset?.placement ? (
                  <p className="mt-2 text-sm">{t("当前位置：{placement}", { placement: `${asset.placement.roomName} / ${asset.placement.areaName} / ${asset.placement.rackCode} · U${asset.placement.startU}–U${asset.placement.endU}` })}</p>
                ) : null}
              </div>
              <FormField label={t("目标机柜")} htmlFor="rackId" error={form.formState.errors.rackId?.message}>
                <select id="rackId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("rackId")}>
                  <option value="">{t("请选择机柜")}</option>
                  {racks.data?.map((rack) => <option key={rack.id} value={rack.id}>{rack.roomName} / {rack.areaName} / {rack.code} · {rack.totalU}U</option>)}
                </select>
              </FormField>
              <FormField label={t("起始 U 位")} htmlFor="startU" error={form.formState.errors.startU?.message} hint={t("起始 U 位是设备占用的最低位置。")}>
                <Input id="startU" type="number" min={1} max={selectedRack?.totalU ?? 100} {...form.register("startU", { valueAsNumber: true })} />
              </FormField>
              {selectedRack && asset ? (
                <div>
                  <p className="mb-2 text-sm font-medium">{t("可用连续空间")}</p>
                  {ranges.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">{t("当前机柜没有可容纳 {height}U 设备的连续空间。", { height: asset.heightU })}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ranges.map((range) => (
                        <Button key={`${range.startU}-${range.endU}`} type="button" size="sm" variant={startU >= range.startU && endU <= range.endU ? "default" : "outline"} onClick={() => form.setValue("startU", range.startU, { shouldValidate: true, shouldDirty: true })}>
                          U{range.startU}–U{range.endU} · {range.endU - range.startU + 1}U
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              {asset && selectedRack ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${outOfRange || conflict ? "border-destructive bg-destructive/5 text-destructive" : "bg-muted/30"}`}>
                  {t("占用范围：")}<strong>U{startU}–U{endU}</strong> / {t("机柜最高 U{totalU}", { totalU: selectedRack.totalU })}
                  {conflict ? <span className="mt-1 block">{t("与 {name}（U{startU}–U{endU}）冲突", { name: conflict.name, startU: conflict.startU, endU: conflict.endU })}</span> : null}
                  {unchanged ? <span className="mt-1 block text-muted-foreground">{t("当前位置没有变化，请选择新的机柜或 U 位。")}</span> : null}
                </div>
              ) : null}
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button variant="ghost" nativeButton={false} render={<Link to={returnTo} />}><ArrowLeft /> {t("取消")}</Button>
                <Button type="submit" disabled={place.isPending || !asset || !selectedRack || outOfRange || Boolean(conflict) || unchanged}>
                  {place.isPending ? (isMoving ? t("正在移动…") : t("正在上架…")) : isMoving ? t("确认移动") : t("确认上架")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  )
}
