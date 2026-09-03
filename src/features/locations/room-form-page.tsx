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

const schema = z.object({
  code: z.string().trim().min(1, "请输入机房编码"),
  name: z.string().trim().min(1, "请输入机房名称"),
  description: z.string(),
})
type FormData = z.infer<typeof schema>

export function RoomFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", description: "" },
  })
  const create = useMutation({
    mutationFn: tauriClient.createRoom,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations })
      navigate("/locations")
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader eyebrow="Location" title="新建机房" description="创建物理位置的第一层。" />
      <PageBody>
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
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="机房编码" htmlFor="code" error={form.formState.errors.code?.message}>
                  <Input id="code" autoFocus placeholder="例如 DC-01" {...form.register("code")} />
                </FormField>
                <FormField label="机房名称" htmlFor="name" error={form.formState.errors.name?.message}>
                  <Input id="name" placeholder="例如 一层机房" {...form.register("name")} />
                </FormField>
              </div>
              <FormField label="描述" htmlFor="description">
                <Textarea id="description" placeholder="可选" {...form.register("description")} />
              </FormField>
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button variant="ghost" nativeButton={false} render={<Link to="/locations" />}>
                  <ArrowLeft /> 取消
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "正在保存…" : "保存机房"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  )
}
