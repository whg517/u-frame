const requirement = "(?:LOC|RACK|AST|PLC|VIEW|IMP|EXP|AUD|UX|SET)-\\d{3}"

export function traceabilityErrors(prd, stories) {
  const errors = []
  const definitions = [...prd.matchAll(new RegExp(`^\\|\\s*(${requirement})\\s*\\|`, "gm"))].map((m) => m[1])
  const defined = new Set(definitions)
  for (const id of new Set(definitions.filter((id, i) => definitions.indexOf(id) !== i))) errors.push(`Duplicate PRD requirement: ${id}`)
  // A story ID such as US-LOC-001 is not a reference to requirement LOC-001.
  const refs = new Set(stories.match(new RegExp(`(?<!US-)\\b${requirement}\\b`, "g")) ?? [])
  for (const id of defined) if (!refs.has(id)) errors.push(`Requirement has no story reference: ${id}`)
  for (const id of refs) if (!defined.has(id)) errors.push(`Unknown requirement in stories: ${id}`)
  const ids = [...stories.matchAll(/^### (US-[A-Z]+-\d{3})\b/gm)].map((m) => m[1])
  const declared = new Set(ids)
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) errors.push(`Duplicate story: ${id}`)
  for (const id of new Set(stories.match(/\bUS-[A-Z]+-\d{3}\b/g) ?? [])) {
    if (!declared.has(id)) errors.push(`Unknown story reference: ${id}`)
  }
  return { errors, requirements: defined.size, stories: declared.size }
}

export function markdownBody(content) {
  const lines = []
  let fence = null
  for (const line of content.split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (marker) {
      if (!fence) fence = marker[1]
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null
      continue
    }
    if (!fence) lines.push(line)
  }
  return { body: lines.join("\n"), unclosedFence: fence !== null }
}
