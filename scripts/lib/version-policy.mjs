// Release tags intentionally exclude build metadata: each version names one artifact set.
export function versionErrors(versions, tag) {
  const errors = []
  const entries = Object.entries(versions)
  const version = entries[0]?.[1]
  const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
  for (const [file, value] of entries) {
    const match = typeof value === "string" ? value.match(pattern) : null
    if (!match || match[4]?.split(".").some((part) => /^0\d+$/.test(part))) errors.push(`Invalid release version in ${file}: ${value}`)
    if (value !== version) errors.push(`Version mismatch in ${file}: ${value} != ${version}`)
  }
  if (!entries.length) errors.push("No application versions found")
  if (tag !== undefined && tag !== `v${version}`) errors.push(`Release tag ${tag} does not match v${version}`)
  return errors
}

export function cargoVersions(manifest, lock) {
  const section = manifest.split(/^\[/m).find((part) => part.startsWith("package]"))
  const app = lock.split(/^\[\[package\]\]\s*$/m).filter((part) => /^name = "u-frame"$/m.test(part))
  return {
    "src-tauri/Cargo.toml": section?.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1],
    "src-tauri/Cargo.lock": app.length === 1 ? app[0].match(/^version = "([^"]+)"$/m)?.[1] : undefined,
  }
}
