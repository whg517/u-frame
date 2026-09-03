import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/shared/components/empty-state"
import { FormField } from "@/shared/components/form-field"
import { PageBody, PageHeader } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useRacks } from "@/features/racks/queries"
import { useAssets } from "./queries"

const schema = z.object({
  rackId: z.string().min(1, "请选择目标机柜"),
  startU: z.number().int().min(1, "起始位置不能低于 U1"),
})
type FormData = z.infer<typeof schema>

export function PlacementFormPage() {
  const { assetId = "" } = useParams()
  const assets = useAssets()
  const racks = useRacks()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { rackId: "", startU: 1 } })
  const rackId = useWatch({ control: form.control, name: "rackId" })
  const selectedRack = racks.data?.find((rack) => rack.id === rackId)
  const asset = assets.data?.find((item) => item.id === assetId)
  const startU = useWatch({ control: form.control, name: "startU" })
  const endU = asset ? startU + asset.heightU - 1 : startU
  const place = useMutation({
    mutationFn: tauriClient.placeAsset,
    onSuccess: async (placement) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: ["rack-view"] }),
      ])
      const rack = racks.data?.find((item) => item.id === placement.rackId)
      navigate(`/?area=${encodeURIComponent(rack?.areaId ?? "")}&highlight=${encodeURIComponent(placement.assetId)}`)
    },
  })

  if (assets.isSuccess && !asset) {
    return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title="设备上架" /><PageBody><EmptyState title="没有找到设备" description="设备可能已不存在。" action={<Button nativeButton={false} render={<Link to="/assets" />}>返回设备列表</Button>} /></PageBody></div>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader eyebrow="Rack placement" title="设备上架" description="选择机柜和最低占用 U 位，保存前会显示完整范围。" />
      <PageBody>
        <Card className="mx-auto max-w-2xl">
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit((values) => place.mutate({ assetId, ...values }))}>
              {place.isError ? <Alert variant="destructive"><AlertTitle>上架失败</AlertTitle><AlertDescription>{errorMessage(place.error)}</AlertDescription></Alert> : null}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">{asset?.name ?? "正在读取设备…"}</p>
                <p className="mt-1 text-sm text-muted-foreground">设备高度 {asset?.heightU ?? "—"}U</p>
              </div>
              <FormField label="目标机柜" htmlFor="rackId" error={form.formState.errors.rackId?.message}>
                <select id="rackId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("rackId")}>
                  <option value="">请选择机柜</option>
                  {racks.data?.map((rack) => <option key={rack.id} value={rack.id}>{rack.roomName} / {rack.areaName} / {rack.code} · {rack.totalU}U</option>)}
                </select>
              </FormField>
              <FormField label="起始 U 位" htmlFor="startU" error={form.formState.errors.startU?.message} hint="起始 U 位是设备占用的最低位置。">
                <Input id="startU" type="number" min={1} max={selectedRack?.totalU ?? 100} {...form.register("startU", { valueAsNumber: true })} />
              </FormField>
              {asset && selectedRack ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${endU > selectedRack.totalU ? "border-destructive text-destructive" : "bg-muted/30"}`}>
                  占用范围：<strong>U{startU}–U{endU}</strong> / 机柜最高 U{selectedRack.totalU}
                </div>
              ) : null}
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button variant="ghost" nativeButton={false} render={<Link to="/assets" />}><ArrowLeft /> 取消</Button>
                <Button type="submit" disabled={place.isPending || !asset || !selectedRack || endU > selectedRack.totalU}>{place.isPending ? "正在上架…" : "确认上架"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  )
}
