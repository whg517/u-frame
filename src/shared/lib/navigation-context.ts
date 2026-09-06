export function safeReturnTo(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

export function routeWithParams(path: string, values: Record<string, string | null | undefined>): string {
  const [pathname, query = ""] = path.split("?", 2)
  const params = new URLSearchParams(query)
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const serialized = params.toString()
  return serialized ? `${pathname}?${serialized}` : pathname
}

export function currentRoute(pathname: string, search: string): string {
  return `${pathname}${search}`
}
