import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import boundaries from "./scripts/eslint-boundaries.mjs"

export default tseslint.config(
  { ignores: ["dist", "src-tauri/target", "src/shared/lib/tauri-client/bindings.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
    },
    plugins: { "react-refresh": reactRefresh },
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["*.{js,mjs,ts}", "scripts/**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/testing/**"],
    plugins: { architecture: boundaries },
    rules: { "architecture/dependency-direction": "error" },
  },
)
