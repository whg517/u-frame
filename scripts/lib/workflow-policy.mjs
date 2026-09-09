import { targets } from "./release-policy.mjs"

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
    const publishing = name === "release.yml" && id === "publish"
    if (!Number.isInteger(job["timeout-minutes"]) || job["timeout-minutes"] < 1) fail(`${id}: finite timeout is required`)
    if (hasSecrets(job.env)) fail(`${id}: job-level secrets are forbidden`)
    if (job["continue-on-error"]) fail(`${id}: job failure must not be ignored`)
    if (typeof job.permissions === "string") fail(`${id}: permissions must be explicit`)
    for (const [permission, level] of Object.entries(job.permissions ?? {})) {
      if (level === "write" && !(publishing && permission === "contents")) fail(`${id}: unexpected write permission`)
    }
    for (const step of job.steps ?? []) {
      if (step.uses && !/^[\w-]+\/[\w-]+(?:\/[\w/-]+)?@[a-f0-9]{40}$/.test(step.uses)) fail(`${id}: Action must pin a full SHA`)
      if (step.uses?.startsWith("actions/checkout@") && step.with?.["persist-credentials"] !== false) fail(`${id}: checkout must disable credential persistence`)
      if (step.uses?.startsWith("pnpm/action-setup@") && step.with?.version) fail("pnpm version must come from packageManager")
      if (step.run?.includes("${{")) fail(`${id}: expressions must enter scripts through env, not run interpolation`)
      if (hasSecrets(step)) fail(`${id}: release no longer uses external signing secrets`)
      if (/github\.token/.test(JSON.stringify(step.env ?? {})) && !(publishing && step.id === "publish")) fail(`${id}: token only belongs to publish`)
    }
  }
  if (name === "ci.yml") {
    const job = workflow.jobs?.["quality-gate"]
    if (!mandatory(job, "pnpm gate") || job.if !== undefined) fail("stable quality-gate must unconditionally execute pnpm gate")
    if (!events.includes("pull_request") || !workflow.on.push?.branches?.includes("main")) fail("PR and main push checks are required")
  }
  if (name === "release.yml") {
    const verify = workflow.jobs?.["verify-source"]
    const build = workflow.jobs?.build
    const publish = workflow.jobs?.publish
    const tagOnly = "startsWith(github.ref, 'refs/tags/v')"
    if (events.some((event) => !["push", "pull_request"].includes(event)) ||
        !workflow.on.push?.tags?.includes("v*.*.*") || workflow.on.push.branches ||
        !workflow.on.pull_request?.branches?.includes("main")) fail("release supports main PR validation and version tags only")
    if (!mandatory(verify, "pnpm gate") || verify.if !== undefined) fail("unconditional isolated gate is required")
    if (!verify?.steps?.some((s) => s.run === "bash scripts/check-release-source.sh" && s.if === tagOnly && !s["continue-on-error"])) fail("tag ancestry and version verification are required")
    if (build?.needs !== "verify-source" || build.if !== undefined || build.strategy?.["fail-fast"] !== false) fail("all builds must follow source verification")
    const expected = targets.map(({ id, runner, target, bundles }) => ({ id, runner, target, bundles }))
    if (JSON.stringify(build?.strategy?.matrix?.include) !== JSON.stringify(expected)) fail("exact four-platform native build matrix is required")
    if (!mandatory(build, "cargo test --locked --manifest-path src-tauri/Cargo.toml --all-targets") ||
        !mandatory(build, 'pnpm tauri build --target "$RUST_TARGET" --bundles "$BUNDLES"')) fail("native tests and builds are required")
    if (publish?.if !== tagOnly || JSON.stringify(publish.needs) !== JSON.stringify(["verify-source", "build"])) fail("publish must be tag-only and depend on every build")
    if (!mandatory(publish, "bash scripts/check-release-source.sh") ||
        !mandatory(publish, 'node scripts/publish-release.mjs "$RUNNER_TEMP/packages"')) fail("verified publishing entry and source recheck are required")
    const upload = build?.steps?.find((s) => s.uses?.startsWith("actions/upload-artifact@"))
    if (!upload || upload.if !== undefined || upload["continue-on-error"] || upload.with?.["if-no-files-found"] !== "error") fail("missing packages must fail upload")
    const collect = build?.steps?.find((s) => s.run?.includes("node scripts/release-artifacts.mjs collect"))
    if (!collect || collect.if !== undefined || collect["continue-on-error"] || build.steps.indexOf(collect) >= build.steps.indexOf(upload)) fail("package validation must precede upload")
  }
  return errors
}
