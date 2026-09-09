import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, resolve, relative, isAbsolute } from "node:path"
import { markdownBody, traceabilityErrors } from "./lib/document-policy.mjs"

const root = resolve(import.meta.dirname, "..")
function markdownFilesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? markdownFilesBelow(path) : entry.name.endsWith(".md") ? [path] : []
  })
}
const files = [
  ...readdirSync(root).filter((name) => name.endsWith(".md")).map((name) => resolve(root, name)),
  ...markdownFilesBelow(resolve(root, "docs")),
  ...markdownFilesBelow(resolve(root, ".github")),
]
const errors = []
for (const file of files) {
  if (statSync(file).size === 0) { errors.push(`Empty Markdown: ${file}`); continue }
  const { body, unclosedFence } = markdownBody(readFileSync(file, "utf8"))
  if (unclosedFence) errors.push(`Unclosed fenced code block: ${file}`)
  for (const [, raw] of body.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = raw.trim().match(/^<([^>]+)>|^(\S+)/)?.slice(1).find(Boolean)
    if (!target || /^(https?:|mailto:|#)/.test(target)) continue
    try {
      const path = resolve(dirname(file), decodeURIComponent(target.split("#")[0]))
      const local = relative(root, path)
      if (local.startsWith("..") || isAbsolute(local) || !existsSync(path)) errors.push(`Broken or external local link in ${file}: ${target}`)
    } catch { errors.push(`Malformed link in ${file}: ${target}`) }
  }
}
const trace = traceabilityErrors(readFileSync(resolve(root, "docs/PRD.md"), "utf8"), readFileSync(resolve(root, "docs/USER_STORIES.md"), "utf8"))
errors.push(...trace.errors)
if (errors.length) { errors.forEach((error) => console.error(`ERROR: ${error}`)); process.exit(1) }
console.log(`Documentation checks passed: ${files.length} files, ${trace.requirements} requirements, ${trace.stories} user stories.`)
