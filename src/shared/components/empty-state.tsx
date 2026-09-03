import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  action,
  variant = "panel",
}: {
  title: string
  description: string
  action?: ReactNode
  variant?: "panel" | "canvas"
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        variant === "panel"
          ? "min-h-64 rounded-xl border border-dashed bg-muted/20"
          : "min-h-0",
      )}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-full border bg-background text-lg">
        U
      </div>
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
