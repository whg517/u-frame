import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
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
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "./queries"

const schema = z.object({
  roomId: z.string().min(1, "请选择所属机房"),
  code: z.string().trim().min(1, "请输入区域编码"),
  name: z.string().trim().min(1, "请输入区域名称"),
  description: z.string(),
})
type FormData = z.infer<typeof schema>

export function AreaFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locations = useLocations()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roomId: "", code: "", name: "", description: "" },
  })
  const create = useMutation({
    mutationFn: tauriClient.createArea,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations })
      navigate("/locations")
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader eyebrow="Location" title="新建区域" description="在已有机房下建立区域。" />
      <PageBody>
        {locations.isSuccess && locations.data.rooms.length === 0 ? (
          <EmptyState
            title="请先创建机房"
            description="区域必须属于一个活动机房。"
            action={<Button nativeButton={false} render={<Link to="/locations/rooms/new" />}><Plus /> 新建机房</Button>}
          />
        ) : (
          <Card className="mx-auto max-w-2xl">
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={form.handleSubmit((values) =>
                  create.mutate({ ...values, description: values.description || null }),
                )}
              >
                {create.isError ? (
                  <Alert variant="destructive">
                    <AlertTitle>保存失败</AlertTitle>
                    <AlertDescription>{errorMessage(create.error)}</AlertDescription>
                  </Alert>
                ) : null}
                <FormField label="所属机房" htmlFor="roomId" error={form.formState.errors.roomId?.message}>
                  <select
                    id="roomId"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    {...form.register("roomId")}
                  >
                    <option value="">请选择机房</option>
                    {locations.data?.rooms.map(({ room }) => (
                      <option key={room.id} value={room.id}>{room.name} · {room.code}</option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="区域编码" htmlFor="code" error={form.formState.errors.code?.message}>
                    <Input id="code" placeholder="例如 A" {...form.register("code")} />
                  </FormField>
                  <FormField label="区域名称" htmlFor="name" error={form.formState.errors.name?.message}>
                    <Input id="name" placeholder="例如 A 区" {...form.register("name")} />
                  </FormField>
                </div>
                <FormField label="描述" htmlFor="description">
                  <Textarea id="description" placeholder="可选" {...form.register("description")} />
                </FormField>
                <div className="flex justify-end gap-2 border-t pt-5">
                  <Button variant="ghost" nativeButton={false} render={<Link to="/locations" />}><ArrowLeft /> 取消</Button>
                  <Button type="submit" disabled={create.isPending}>{create.isPending ? "正在保存…" : "保存区域"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </div>
  )
}
