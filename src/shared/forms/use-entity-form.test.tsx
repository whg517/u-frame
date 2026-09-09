import { fireEvent, render, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { expect, it } from "vitest"
import { useEntityForm } from "./use-entity-form"

function Editor({ entityId, name }: { entityId?: string; name?: string }) {
  const form = useForm({ defaultValues: { name: "" } })
  useEntityForm(form, entityId, name === undefined ? undefined : { name })
  return <input aria-label="名称" {...form.register("name")} />
}

it("keeps the draft on refetch, loads another entity, and resets when creating", () => {
  const page = render(<Editor entityId="one" />)
  page.rerender(<Editor entityId="one" name="机房一" />)
  expect(screen.getByRole("textbox")).toHaveValue("机房一")
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "草稿" } })
  page.rerender(<Editor entityId="one" name="外部更新" />)
  expect(screen.getByRole("textbox")).toHaveValue("草稿")
  page.rerender(<Editor entityId="two" />)
  page.rerender(<Editor entityId="two" name="机房二" />)
  expect(screen.getByRole("textbox")).toHaveValue("机房二")
  page.rerender(<Editor />)
  expect(screen.getByRole("textbox")).toHaveValue("")
})
