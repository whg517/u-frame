import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/shared/components/form-field"
import { PageBody, PageHeader } from "@/shared/components/page"
import { errorMessage } from "@/shared/lib/errors"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"

const optionalIp = z.string().refine((value) => {
  if (!value.trim()) return true
  return /^((\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]+)$/.test(value.trim())
}, "请输入有效的 IP 地址")

const schema = z.object({
  type: z.enum(["server", "switch", "router", "firewall"]),
  name: z.string().trim().min(1, "请输入设备名称"),
  hostname: z.string(),
  intranetIp: optionalIp,
  managementIp: optionalIp,
  serialNumber: z.string(),
  vendor: z.string(),
  model: z.string(),
  purpose: z.string(),
  heightU: z.number().int().min(1, "最少为 1U").max(100, "最多为 100U"),
  status: z.enum(["active", "maintenance", "offline"]),
  notes: z.string(),
})
type FormData = z.infer<typeof schema>

const nullable = (value: string) => value.trim() || null

export function AssetFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "server", name: "", hostname: "", intranetIp: "", managementIp: "",
      serialNumber: "", vendor: "", model: "", purpose: "", heightU: 1,
      status: "active", notes: "",
    },
  })
  const create = useMutation({
    mutationFn: tauriClient.createAsset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assets })
      navigate("/assets")
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader eyebrow="Physical assets" title="新建设备" description="设备可以暂不上架，物理位置由上架记录统一维护。" />
      <PageBody>
        <Card className="mx-auto max-w-3xl">
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit((value) => create.mutate({
              type: value.type, name: value.name, hostname: nullable(value.hostname), intranetIp: nullable(value.intranetIp),
              managementIp: nullable(value.managementIp), serialNumber: nullable(value.serialNumber), vendor: nullable(value.vendor),
              model: nullable(value.model), purpose: nullable(value.purpose), heightU: value.heightU, status: value.status, notes: nullable(value.notes),
            }))}>
              {create.isError ? <Alert variant="destructive"><AlertTitle>保存失败</AlertTitle><AlertDescription>{errorMessage(create.error)}</AlertDescription></Alert> : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="设备类型" htmlFor="type">
                  <select id="type" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("type")}>
                    <option value="server">服务器</option><option value="switch">交换机</option><option value="router">路由器</option><option value="firewall">防火墙</option>
                  </select>
                </FormField>
                <FormField label="设备状态" htmlFor="status">
                  <select id="status" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("status")}>
                    <option value="active">运行中</option><option value="maintenance">维护中</option><option value="offline">离线</option>
                  </select>
                </FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
                <FormField label="设备名称" htmlFor="name" error={form.formState.errors.name?.message}><Input id="name" autoFocus placeholder="例如 计算节点 01" {...form.register("name")} /></FormField>
                <FormField label="高度" htmlFor="heightU" error={form.formState.errors.heightU?.message}><Input id="heightU" type="number" min={1} max={100} {...form.register("heightU", { valueAsNumber: true })} /></FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="主机名" htmlFor="hostname"><Input id="hostname" {...form.register("hostname")} /></FormField>
                <FormField label="序列号" htmlFor="serialNumber"><Input id="serialNumber" {...form.register("serialNumber")} /></FormField>
                <FormField label="内网 IP" htmlFor="intranetIp" error={form.formState.errors.intranetIp?.message}><Input id="intranetIp" placeholder="10.0.0.10" {...form.register("intranetIp")} /></FormField>
                <FormField label="管理 IP" htmlFor="managementIp" error={form.formState.errors.managementIp?.message}><Input id="managementIp" placeholder="可选" {...form.register("managementIp")} /></FormField>
                <FormField label="厂商" htmlFor="vendor"><Input id="vendor" {...form.register("vendor")} /></FormField>
                <FormField label="型号" htmlFor="model"><Input id="model" {...form.register("model")} /></FormField>
              </div>
              <FormField label="用途" htmlFor="purpose"><Input id="purpose" {...form.register("purpose")} /></FormField>
              <FormField label="备注" htmlFor="notes"><Textarea id="notes" {...form.register("notes")} /></FormField>
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button variant="ghost" nativeButton={false} render={<Link to="/assets" />}><ArrowLeft /> 取消</Button>
                <Button type="submit" disabled={create.isPending}>{create.isPending ? "正在保存…" : "保存设备"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  )
}
