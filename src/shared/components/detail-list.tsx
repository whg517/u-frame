import type { ReactNode } from "react"

export interface DetailItem {
  label: string
  value: ReactNode
}

export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="divide-y border-y text-sm">
      {items.map((item) => (
        <div
          className="grid grid-cols-[minmax(96px,0.35fr)_minmax(0,1fr)] gap-6 py-3"
          key={item.label}
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="break-words text-right font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DetailMetric({
  label,
  value,
  description,
}: {
  label: string
  value: ReactNode
  description?: string
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  )
}
