import path from "node:path"
import { ESLint } from "eslint"
import { expect, it } from "vitest"

it("rejects reverse and cross-feature imports including relative and lazy imports", async () => {
  const eslint = new ESLint()
  const cases = [
    ["src/features/assets/example.ts", 'import "@/features/racks/queries"'],
    ["src/features/assets/example.ts", 'import "../racks/queries"'],
    ["src/features/assets/example.ts", 'void import("../racks/queries")'],
    ["src/shared/example.ts", 'export * from "../features/assets/queries"'],
    ["src/features/assets/example.ts", 'import "@/app/provider"'],
  ]
  for (const [filePath, code] of cases) {
    const [result] = await eslint.lintText(code, { filePath: path.resolve(filePath) })
    expect(result.messages.some(({ ruleId }) => ruleId === "architecture/dependency-direction")).toBe(true)
  }
  const [allowed] = await eslint.lintText('import "@/shared/queries/racks"', {
    filePath: path.resolve("src/features/assets/example.ts"),
  })
  expect(allowed.errorCount).toBe(0)
})
