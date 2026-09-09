import type { DefaultStartupPage } from "./preferences"

export const startupPagePaths: Record<DefaultStartupPage, string> = {
  rackOverview: "/",
  locations: "/locations",
  racks: "/racks",
  assets: "/assets",
}

export function applyStartupRoute(
  startupPage: DefaultStartupPage,
  location: Pick<Location, "pathname" | "search" | "hash"> = window.location,
  history: Pick<History, "replaceState"> = window.history,
) {
  const startupPath = startupPagePaths[startupPage]
  const isCleanRoot = location.pathname === "/" && !location.search && !location.hash
  if (!isCleanRoot || startupPath === "/") return false

  history.replaceState(null, "", startupPath)
  return true
}
