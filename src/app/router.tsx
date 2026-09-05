import { createBrowserRouter, RouterProvider } from "react-router"

import { AppLayout } from "./layout"
import { AssetDetailPage } from "@/features/assets/asset-detail-page"
import { AssetFormPage } from "@/features/assets/asset-form-page"
import { AssetsPage } from "@/features/assets/assets-page"
import { PlacementFormPage } from "@/features/assets/placement-form-page"
import { AreaFormPage } from "@/features/locations/area-form-page"
import { AreaDetailPage, RoomDetailPage } from "@/features/locations/location-detail-page"
import { LocationsPage } from "@/features/locations/locations-page"
import { RoomFormPage } from "@/features/locations/room-form-page"
import { RackCanvasPage } from "@/features/rack-view/rack-canvas-page"
import { RackDetailPage } from "@/features/racks/rack-detail-page"
import { RackFormPage } from "@/features/racks/rack-form-page"
import { RacksPage } from "@/features/racks/racks-page"

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <RackCanvasPage /> },
      { path: "locations", element: <LocationsPage /> },
      { path: "locations/rooms/new", element: <RoomFormPage /> },
      { path: "locations/rooms/:roomId/edit", element: <RoomFormPage /> },
      { path: "locations/rooms/:roomId", element: <RoomDetailPage /> },
      { path: "locations/areas/new", element: <AreaFormPage /> },
      { path: "locations/areas/:areaId/edit", element: <AreaFormPage /> },
      { path: "locations/areas/:areaId", element: <AreaDetailPage /> },
      { path: "racks", element: <RacksPage /> },
      { path: "racks/new", element: <RackFormPage /> },
      { path: "racks/:rackId/edit", element: <RackFormPage /> },
      { path: "racks/:rackId", element: <RackDetailPage /> },
      { path: "assets", element: <AssetsPage /> },
      { path: "assets/new", element: <AssetFormPage /> },
      { path: "assets/:assetId/edit", element: <AssetFormPage /> },
      { path: "assets/:assetId", element: <AssetDetailPage /> },
      { path: "assets/:assetId/place", element: <PlacementFormPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
