import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/shared/components/form-field"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"
import { assetStatusLabel, assetTypeLabel } from "@/shared/lib/asset-labels"
import { errorMessage } from "@/shared/lib/errors"
import { routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useAssets } from "./queries"

const createSchema = () => {
  const optionalIp = z.string().refine((value) => {
    if (!value.trim()) return true
    return /^((\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]+)$/.test(value.trim())
  }, t("请输入有效的 IP 地址"))
  return z.object({
    type: z.enum(["server", "switch", "router", "firewall"]),
    name: z.string().trim().min(1, t("请输入设备名称")),
    hostname: z.string(),
    intranetIp: optionalIp,
    managementIp: optionalIp,
    serialNumber: z.string(),
    vendor: z.string(),
    model: z.string(),
    purpose: z.string(),
    heightU: z.number().int().min(1, t("最少为 1U")).max(100, t("最多为 100U")),
    status: z.enum(["active", "maintenance", "offline"]),
    notes: z.string(),
  })
}
type FormData = z.infer<ReturnType<typeof createSchema>>

const nullable = (value: string) => value.trim() || null

export function AssetFormPage() {
  const schema = useMemo(() => createSchema(), [])
  const { assetId } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(assetId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const assets = useAssets()
  const asset = assets.data?.find((item) => item.id === assetId)
  const rackId = searchParams.get("rackId")
  const returnTo = safeReturnTo(searchParams.get("returnTo"), assetId ? `/assets/${assetId}` : "/assets")
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "server", name: "", hostname: "", intranetIp: "", managementIp: "",
      serialNumber: "", vendor: "", model: "", purpose: "", heightU: 1,
      status: "active", notes: "",
    },
  })
  useEffect(() => {
    if (!asset) return
    form.reset({
      type: asset.type as FormData["type"],
      name: asset.name,
      hostname: asset.hostname ?? "",
      intranetIp: asset.intranetIp ?? "",
      managementIp: asset.managementIp ?? "",
      serialNumber: asset.serialNumber ?? "",
      vendor: asset.vendor ?? "",
      model: asset.model ?? "",
      purpose: asset.purpose ?? "",
      heightU: asset.heightU,
      status: asset.status as FormData["status"],
      notes: asset.notes ?? "",
    })
  }, [asset, form])
  const save = useMutation({
    mutationFn: (value: FormData) => {
      const input = {
        type: value.type, name: value.name, hostname: nullable(value.hostname), intranetIp: nullable(value.intranetIp),
        managementIp: nullable(value.managementIp), serialNumber: nullable(value.serialNumber), vendor: nullable(value.vendor),
        model: nullable(value.model), purpose: nullable(value.purpose), heightU: value.heightU, status: value.status, notes: nullable(value.notes),
      }
      return assetId
        ? tauriClient.updateAsset({ assetId, ...input })
        : tauriClient.createAsset(input)
    },
    onSuccess: async (savedAsset) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      if (!assetId && rackId) {
        navigate(routeWithParams(`/assets/${savedAsset.id}/place`, { rackId, returnTo }))
        return
      }
      navigate(returnTo)
    },
  })

  if (isEditing && assets.isPending) {
    return <AssetFormState title={t("编辑设备")} message={t("正在读取设备…")} />
  }
  if (isEditing && (assets.isError || !asset)) {
    return <AssetFormState title={t("编辑设备")} message={assets.isError ? errorMessage(assets.error) : t("没有找到这个设备。")} error />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={isEditing ? t("编辑设备") : t("新建设备")}
        description={isEditing ? t("修改设备台账字段；已上架设备调整高度时会重新校验 U 位。") : t("设备可以暂不上架，物理位置由上架记录统一维护。")}
      />
      <PageBody>
        <Card className="mx-auto max-w-3xl">
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit((value) => save.mutate(value))}>
              {save.isError ? <Alert variant="destructive"><AlertTitle>{t("保存失败")}</AlertTitle><AlertDescription>{errorMessage(save.error)}</AlertDescription></Alert> : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t("设备类型")} htmlFor="type">
                  <select id="type" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("type")}>
                    <option value="server">{assetTypeLabel("server")}</option><option value="switch">{assetTypeLabel("switch")}</option><option value="router">{assetTypeLabel("router")}</option><option value="firewall">{assetTypeLabel("firewall")}</option>
                  </select>
                </FormField>
                <FormField label={t("设备状态")} htmlFor="status">
                  <select id="status" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("status")}>
                    <option value="active">{assetStatusLabel("active")}</option><option value="maintenance">{assetStatusLabel("maintenance")}</option><option value="offline">{assetStatusLabel("offline")}</option>
                  </select>
                </FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
                <FormField label={t("设备名称")} htmlFor="name" error={form.formState.errors.name?.message}><Input id="name" autoFocus placeholder={t("例如 计算节点 01")} {...form.register("name")} /></FormField>
                <FormField label={t("高度")} htmlFor="heightU" error={form.formState.errors.heightU?.message}><Input id="heightU" type="number" min={1} max={100} {...form.register("heightU", { valueAsNumber: true })} /></FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t("主机名")} htmlFor="hostname"><Input id="hostname" {...form.register("hostname")} /></FormField>
                <FormField label={t("序列号")} htmlFor="serialNumber"><Input id="serialNumber" {...form.register("serialNumber")} /></FormField>
                <FormField label={t("内网 IP")} htmlFor="intranetIp" error={form.formState.errors.intranetIp?.message}><Input id="intranetIp" placeholder="10.0.0.10" {...form.register("intranetIp")} /></FormField>
                <FormField label={t("管理 IP")} htmlFor="managementIp" error={form.formState.errors.managementIp?.message}><Input id="managementIp" placeholder={t("可选")} {...form.register("managementIp")} /></FormField>
                <FormField label={t("厂商")} htmlFor="vendor"><Input id="vendor" {...form.register("vendor")} /></FormField>
                <FormField label={t("型号")} htmlFor="model"><Input id="model" {...form.register("model")} /></FormField>
              </div>
              <FormField label={t("用途")} htmlFor="purpose"><Input id="purpose" {...form.register("purpose")} /></FormField>
              <FormField label={t("备注")} htmlFor="notes"><Textarea id="notes" {...form.register("notes")} /></FormField>
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button variant="ghost" nativeButton={false} render={<Link to={returnTo} />}><ArrowLeft /> {t("取消")}</Button>
                <Button type="submit" disabled={save.isPending}>{save.isPending ? t("正在保存…") : isEditing ? t("保存修改") : t("保存设备")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  )
}

function AssetFormState({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
