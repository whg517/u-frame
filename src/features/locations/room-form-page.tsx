import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useEffect } from "react"
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
import { errorMessage } from "@/shared/lib/errors"
import { routeWithParams, safeReturnTo } from "@/shared/lib/navigation-context"
import { queryKeys } from "@/shared/lib/query-keys"
import { tauriClient } from "@/shared/lib/tauri-client/client"
import { useLocations } from "./queries"

const schema = z.object({
  code: z.string().trim().min(1, "请输入机房编码"),
  name: z.string().trim().min(1, "请输入机房名称"),
  description: z.string(),
})
type FormData = z.infer<typeof schema>

export function RoomFormPage() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(roomId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locations = useLocations()
  const returnTo = safeReturnTo(searchParams.get("returnTo"), roomId ? `/locations/rooms/${roomId}` : "/locations")
  const room = locations.data?.rooms.find((node) => node.room.id === roomId)?.room
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", description: "" },
  })
  useEffect(() => {
    if (!room) return
    form.reset({
      code: room.code,
      name: room.name,
      description: room.description ?? "",
    })
  }, [form, room])
  const save = useMutation({
    mutationFn: (values: FormData) => {
      const input = { ...values, description: values.description || null }
      return roomId
        ? tauriClient.updateRoom({ roomId, ...input })
        : tauriClient.createRoom(input)
    },
    onSuccess: async (savedRoom) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.locations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.racksRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rackViewRoot }),
      ])
      navigate(!isEditing && returnTo.startsWith("/locations/areas/new")
        ? routeWithParams(returnTo, { roomId: savedRoom.id })
        : returnTo)
    },
  })

  if (isEditing && locations.isPending) {
    return <RoomFormState title="编辑机房" message="正在读取机房…" />
  }
  if (isEditing && (locations.isError || !room)) {
    return <RoomFormState title="编辑机房" message={locations.isError ? errorMessage(locations.error) : "没有找到这个机房。"} error />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Location"
        title={isEditing ? "编辑机房" : "新建机房"}
        description={isEditing ? "修改机房编码、名称和描述。" : "创建物理位置的第一层。"}
      />
      <PageBody>
        <Card className="mx-auto max-w-2xl">
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => save.mutate(values))}
            >
              {save.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>保存失败</AlertTitle>
                  <AlertDescription>{errorMessage(save.error)}</AlertDescription>
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
                <Button variant="ghost" nativeButton={false} render={<Link to={returnTo} />}>
                  <ArrowLeft /> 取消
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "正在保存…" : isEditing ? "保存修改" : "保存机房"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  )
}

function RoomFormState({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title={title} /><PageBody><p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p></PageBody></div>
}
