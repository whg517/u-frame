import type { RouteObject } from "react-router"

import { AppLayout } from "./layout"
import { NotFoundPage, RouteErrorPage, RouteLoading } from "./route-state"

export const routes: RouteObject[] = [
  {
    Component: AppLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: RouteLoading,
    children: [
      {
        ErrorBoundary: RouteErrorPage,
        children: [
          { index: true, lazy: async () => ({ Component: (await import("@/features/rack-view/rack-canvas-page")).RackCanvasPage }) },
          { path: "locations", lazy: async () => ({ Component: (await import("@/features/locations/locations-page")).LocationsPage }) },
          { path: "locations/rooms/new", lazy: async () => ({ Component: (await import("@/features/locations/room-form-page")).RoomFormPage }) },
          { path: "locations/rooms/:roomId/edit", lazy: async () => ({ Component: (await import("@/features/locations/room-form-page")).RoomFormPage }) },
          { path: "locations/rooms/:roomId", lazy: async () => ({ Component: (await import("@/features/locations/location-detail-page")).RoomDetailPage }) },
          { path: "locations/areas/new", lazy: async () => ({ Component: (await import("@/features/locations/area-form-page")).AreaFormPage }) },
          { path: "locations/areas/:areaId/edit", lazy: async () => ({ Component: (await import("@/features/locations/area-form-page")).AreaFormPage }) },
          { path: "locations/areas/:areaId", lazy: async () => ({ Component: (await import("@/features/locations/location-detail-page")).AreaDetailPage }) },
          { path: "racks", lazy: async () => ({ Component: (await import("@/features/racks/racks-page")).RacksPage }) },
          { path: "racks/new", lazy: async () => ({ Component: (await import("@/features/racks/rack-form-page")).RackFormPage }) },
          { path: "racks/:rackId/edit", lazy: async () => ({ Component: (await import("@/features/racks/rack-form-page")).RackFormPage }) },
          { path: "racks/:rackId", lazy: async () => ({ Component: (await import("@/features/racks/rack-detail-page")).RackDetailPage }) },
          { path: "assets", lazy: async () => ({ Component: (await import("@/features/assets/assets-page")).AssetsPage }) },
          { path: "assets/new", lazy: async () => ({ Component: (await import("@/features/assets/asset-form-page")).AssetFormPage }) },
          { path: "assets/:assetId/edit", lazy: async () => ({ Component: (await import("@/features/assets/asset-form-page")).AssetFormPage }) },
          { path: "assets/:assetId", lazy: async () => ({ Component: (await import("@/features/assets/asset-detail-page")).AssetDetailPage }) },
          { path: "assets/:assetId/place", lazy: async () => ({ Component: (await import("@/features/assets/placement-form-page")).PlacementFormPage }) },
          { path: "settings", lazy: async () => ({ Component: (await import("@/features/settings/settings-page")).SettingsPage }) },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
]
