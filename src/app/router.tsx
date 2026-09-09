import { createBrowserRouter, RouterProvider } from "react-router"
import { useState } from "react"

import { routes } from "./routes"

export function AppRouter() {
  const [router] = useState(() => createBrowserRouter(routes))
  return <RouterProvider router={router} />
}
