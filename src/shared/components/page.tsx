import type { ReactNode } from "react"

export const workspaceHeaderHeightClass = "h-24"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className={`${workspaceHeaderHeightClass} flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-6 lg:px-8`}>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-auto p-6 lg:p-8">{children}</div>
}
