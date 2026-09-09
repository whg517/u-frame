import { useEffect, useRef } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"

// An edit session owns its initial snapshot. Refetches must not reset its draft.
export function useEntityForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  entityId: string | undefined,
  values: T | undefined,
) {
  const initializedId = useRef<string | undefined>(undefined)
  const initialValues = useRef(form.getValues())
  useEffect(() => {
    if (!entityId && initializedId.current) {
      form.reset(initialValues.current)
      initializedId.current = undefined
      return
    }
    if (!entityId || !values || initializedId.current === entityId) return
    form.reset(values)
    initializedId.current = entityId
  }, [entityId, form, values])
}
