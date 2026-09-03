export const queryKeys = {
  locations: ["locations"] as const,
  racks: (areaId: string | null = null) => ["racks", areaId] as const,
  assets: ["assets"] as const,
  rackView: (areaId: string | null = null) => ["rack-view", areaId] as const,
}
