import assert from "node:assert/strict"
import { resolve } from "node:path"
import test from "node:test"
import ts from "typescript"

const root = resolve(import.meta.dirname, "../..")

for (const file of ["tsconfig.json", "tsconfig.node.json"]) {
  test(`${file} keeps strict checks and explicit aliases without deprecated baseUrl`, () => {
    const config = ts.readConfigFile(resolve(root, file), ts.sys.readFile)
    assert.equal(config.error, undefined)
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
    assert.deepEqual(parsed.errors, [])
    assert.equal(parsed.options.strict, true)
    assert.equal(parsed.options.baseUrl, undefined)
    assert.equal(parsed.options.ignoreDeprecations, undefined)
    assert.equal(parsed.options.moduleResolution, ts.ModuleResolutionKind.Bundler)
    const result = ts.resolveModuleName(
      "@/shared/lib/query-keys",
      resolve(root, "src/app/alias-check.ts"),
      parsed.options,
      ts.sys,
    )
    assert.equal(result.resolvedModule?.resolvedFileName, resolve(root, "src/shared/lib/query-keys.ts"))
  })
}
