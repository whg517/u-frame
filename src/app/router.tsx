import { createBrowserRouter, RouterProvider } from "react-router"

import { AppLayout } from "./layout"
import { AssetFormPage } from "@/features/assets/asset-form-page"
import { AssetsPage } from "@/features/assets/assets-page"
import { PlacementFormPage } from "@/features/assets/placement-form-page"
import { AreaFormPage } from "@/features/locations/area-form-page"
import { LocationsPage } from "@/features/locations/locations-page"
import { RoomFormPage } from "@/features/locations/room-form-page"
import { RackCanvasPage } from "@/features/rack-view/rack-canvas-page"
import { RackFormPage } from "@/features/racks/rack-form-page"
import { RacksPage } from "@/features/racks/racks-page"

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <RackCanvasPage /> },
      { path: "locations", element: <LocationsPage /> },
      { path: "locations/rooms/new", element: <RoomFormPage /> },
      { path: "locations/areas/new", element: <AreaFormPage /> },
      { path: "racks", element: <RacksPage /> },
      { path: "racks/new", element: <RackFormPage /> },
      { path: "assets", element: <AssetsPage /> },
      { path: "assets/new", element: <AssetFormPage /> },
      { path: "assets/:assetId/place", element: <PlacementFormPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
