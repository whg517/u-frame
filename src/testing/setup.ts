import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"

configure({ asyncUtilTimeout: 5_000 })

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

afterEach(cleanup)
