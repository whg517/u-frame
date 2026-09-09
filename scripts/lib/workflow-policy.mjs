export function workflowErrors(name, workflow) {
  const errors = []
  const fail = (message) => errors.push(`${name}: ${message}`)
  const events = Object.keys(workflow.on ?? {})
  const hasSecrets = (value) => /\bsecrets(?:\.|\[)/.test(JSON.stringify(value ?? {}))
  const mandatory = (job, run) => job?.steps?.some((step) => step.run === run && step.if === undefined && !step["continue-on-error"])
  if (events.some((event) => ["pull_request_target", "workflow_run"].includes(event))) fail("privileged trigger is forbidden")
  if (workflow.permissions?.contents !== "read" || Object.values(workflow.permissions ?? {}).some((p) => p === "write")) fail("workflow must default to read-only")
  if (hasSecrets(workflow.env)) fail("workflow-level secrets are forbidden")
  for (const [id, job] of Object.entries(workflow.jobs ?? {})) {
    const signing = name === "release.yml" && id === "macos-universal"
    if (!Number.isInteger(job["timeout-minutes"]) || job["timeout-minutes"] < 1) fail(`${id}: finite timeout is required`)
    if (hasSecrets(job.env)) fail(`${id}: job-level secrets are forbidden`)
    if (job["continue-on-error"]) fail(`${id}: job failure must not be ignored`)
    if (typeof job.permissions === "string") fail(`${id}: permissions must be explicit`)
    for (const [permission, level] of Object.entries(job.permissions ?? {})) {
      if (level === "write" && !(signing && permission === "contents")) fail(`${id}: unexpected write permission`)
    }
    for (const step of job.steps ?? []) {
      if (step.uses && !/^[\w-]+\/[\w-]+(?:\/[\w/-]+)?@[a-f0-9]{40}$/.test(step.uses)) fail(`${id}: Action must pin a full SHA`)
      if (step.uses?.startsWith("actions/checkout@") && step.with?.["persist-credentials"] !== false) fail(`${id}: checkout must disable credential persistence`)
      if (step.uses?.startsWith("pnpm/action-setup@") && step.with?.version) fail("pnpm version must come from packageManager")
      if (step.run?.includes("${{")) fail(`${id}: expressions must enter scripts through env, not run interpolation`)
      if (hasSecrets(step) && !(signing && step.id === "signed_build")) fail(`${id}: secrets only belong to signed_build`)
      if (/github\.token/.test(JSON.stringify(step.env ?? {})) && !(signing && step.id === "publish")) fail(`${id}: token only belongs to publish`)
    }
  }
  if (name === "ci.yml") {
    const job = workflow.jobs?.["quality-gate"]
    if (!mandatory(job, "pnpm gate") || job.if !== undefined) fail("stable quality-gate must unconditionally execute pnpm gate")
    if (!events.includes("pull_request") || !workflow.on.push?.branches?.includes("main")) fail("PR and main push checks are required")
  }
  if (name === "release.yml") {
    const verify = workflow.jobs?.["verify-source"]
    const signing = workflow.jobs?.["macos-universal"]
    if (events.length !== 1 || events[0] !== "push" || !workflow.on.push.tags?.length || workflow.on.push.branches) fail("release must be tag-only")
    if (!mandatory(verify, "pnpm gate") || !mandatory(verify, "bash scripts/check-release-source.sh") || verify.if !== undefined) fail("release source and gate verification are required")
    if (signing?.needs !== "verify-source" || signing.environment !== "release") fail("signing must depend on isolated source verification and use release environment")
    if (!signing?.steps?.some((s) => s.id === "signed_build" && s.run === "bash scripts/build-signed-release.sh")) fail("signed build entry is required")
    const verifyIndex = signing?.steps?.findIndex((s) => s.run?.startsWith("pnpm release:verify")) ?? -1
    const publishIndex = signing?.steps?.findIndex((s) => s.id === "publish") ?? -1
    if (verifyIndex < 0 || publishIndex <= verifyIndex) fail("artifact verification must precede publish")
    for (const index of [verifyIndex, publishIndex]) {
      const step = signing?.steps?.[index]
      if (step && (step.if !== undefined || step["continue-on-error"])) fail("verification and publishing must use normal success conditions")
    }
  }
  return errors
}
