import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

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
}

export function MultiSelectFilter({
  label,
  allLabel,
  options,
  values,
  onChange,
  disabled = false,
}: MultiSelectFilterProps) {
  const selected = new Set(values)
  const selectedOptions = options.filter((option) => selected.has(option.value))
  const summary = selectedOptions.length === 0
    ? allLabel
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `已选 ${selectedOptions.length} 个${label}`

  const toggle = (value: string, checked: boolean) => {
    onChange(checked
      ? [...values, value]
      : values.filter((current) => current !== value))
  }

  return (
    <details className="group relative" data-testid={`${label}-filter`}>
      <summary
        aria-label={`${label}筛选：${summary}`}
        className={cn(
          "flex h-8 min-w-36 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-input bg-background px-2.5 text-sm outline-none marker:hidden hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="max-w-36 truncate">{summary}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg">
        <FilterOption
          checked={values.length === 0}
          label={allLabel}
          onChange={() => onChange([])}
        />
        <div className="my-1 border-t" />
        <div className="max-h-64 overflow-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">没有可选{label}</p>
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
      </div>
    </details>
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
