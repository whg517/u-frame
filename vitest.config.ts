import { fileURLToPath, URL } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/eslint-boundaries.test.js"],
    environment: "jsdom",
    setupFiles: ["./src/testing/setup.ts"],
    css: true,
    testTimeout: 15_000,
  },
})
