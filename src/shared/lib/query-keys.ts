export const queryKeys = {
  locations: ["locations"] as const,
  racksRoot: ["racks"] as const,
  racks: (areaId: string | null = null) => ["racks", areaId] as const,
  assets: ["assets"] as const,
  rackViewRoot: ["rack-view"] as const,
  rackView: (areaId: string | null = null) => ["rack-view", areaId] as const,
}
