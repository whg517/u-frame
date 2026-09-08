import { Check, ChevronDown } from "lucide-react"
import { Popover } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"
import { t } from "@/shared/i18n/i18n"

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
}

interface MultiSelectFilterProps {
  label: string
  allLabel: string
  options: MultiSelectOption[]
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MultiSelectFilter({
  label,
  allLabel,
  options,
  values,
  onChange,
  disabled = false,
  open,
  onOpenChange,
}: MultiSelectFilterProps) {
  const selected = new Set(values)
  const selectedOptions = options.filter((option) => selected.has(option.value))
  const summary = selectedOptions.length === 0
    ? allLabel
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : selectedOptions.length <= 2
        ? selectedOptions.map((option) => option.label).join("、")
        : t("已选 {count} 个{label}", { count: selectedOptions.length, label })

  const toggle = (value: string, checked: boolean) => {
    onChange(checked
      ? [...values, value]
      : values.filter((current) => current !== value))
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        aria-label={t("{label}筛选：{summary}", { label, summary })}
        className={cn(
          "flex h-8 min-w-36 cursor-pointer items-center justify-between gap-3 rounded-md border border-input bg-background px-2.5 text-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted/50",
          disabled && "pointer-events-none opacity-50",
        )}
        disabled={disabled}
        data-testid={`${label}-filter`}
      >
        <span className="max-w-36 truncate">{summary}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform data-[popup-open]:rotate-180" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Popover.Popup className="w-64 origin-top-right rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center justify-between gap-3 px-2 py-1.5">
              <div>
                <p className="text-sm font-medium">{t("选择{label}", { label })}</p>
                <p className="text-xs text-muted-foreground">
                  {values.length === 0 ? t("当前显示{allLabel}", { allLabel }) : t("已选择 {count} 项", { count: values.length })}
                </p>
              </div>
              {values.length > 0 ? (
                <button className="text-xs text-muted-foreground hover:text-foreground" type="button" onClick={() => onChange([])}>
                  {t("清除")}
                </button>
              ) : null}
            </div>
            <div className="my-1 border-t" />
            <div className="max-h-64 overflow-auto">
              {options.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">{t("没有可选{label}", { label })}</p>
              ) : options.map((option) => (
                <FilterOption
                  key={option.value}
                  checked={selected.has(option.value)}
                  label={option.label}
                  description={option.description}
                  onChange={(checked) => toggle(option.value, checked)}
                />
              ))}
            </div>
            <div className="mt-1 border-t p-1 pt-2">
              <Popover.Close className="h-8 w-full rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {t("完成")}
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function FilterOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/70">
      <span className={cn(
        "grid size-4 shrink-0 place-items-center rounded border border-input bg-background",
        checked && "border-primary bg-primary text-primary-foreground",
      )}>
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm">{label}</span>
        {description ? <span className="block truncate text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  )
}
