import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { parse } from "yaml"
import { markdownBody, traceabilityErrors } from "../lib/document-policy.mjs"
import { cargoVersions, versionErrors } from "../lib/version-policy.mjs"
import { workflowErrors } from "../lib/workflow-policy.mjs"

const root = resolve(import.meta.dirname, "../..")
const workflow = (name) => parse(readFileSync(resolve(root, ".github/workflows", name), "utf8"))

test("story IDs alone do not prove requirement coverage; dangling and duplicate references fail", () => {
  const prd = "| LOC-001 | room |"
  assert.match(traceabilityErrors(prd, "### US-LOC-001 Create").errors.join(), /no story reference/)
  assert.deepEqual(traceabilityErrors(prd, "### US-LOC-001 Create\nLOC-001").errors, [])
  assert.match(traceabilityErrors(prd, "LOC-999").errors.join(), /Unknown requirement/)
  assert.match(traceabilityErrors(prd + "\n" + prd, "LOC-001").errors.join(), /Duplicate PRD/)
  assert.match(traceabilityErrors(prd, "LOC-001\nUS-LOC-002").errors.join(), /Unknown story/)
  assert.match(traceabilityErrors(prd, "LOC-001\n### US-LOC-001 A\n### US-LOC-001 B").errors.join(), /Duplicate story/)
})

test("Markdown fences handle tildes, longer nesting and unclosed code", () => {
  assert.deepEqual(markdownBody("before\n~~~~\n~~~\n[ignored](missing)\n~~~~\nafter"), { body: "before\nafter", unclosedFence: false })
  assert.equal(markdownBody("~~~js\nconst a = 1").unclosedFence, true)
})

test("version policy rejects drift, invalid numeric prereleases and mismatched tags", () => {
  for (const version of ["0.1.0", "1.2.3-rc.1"]) assert.deepEqual(versionErrors({ a: version, b: version }, `v${version}`), [])
  for (const version of ["01.2.3", "1.2.3-01", "1.2.3-rc.01", "1.2.3-", "1.2.3+local", undefined]) assert.ok(versionErrors({ a: version }).length)
  assert.match(versionErrors({ a: "0.1.0", b: "0.2.0" }).join(), /mismatch/)
  assert.match(versionErrors({ a: "0.1.0" }, "v0.2.0").join(), /does not match/)
  assert.equal(cargoVersions('[package]\nname = "u-frame"\n[dependencies]\nversion = "9.0.0"', "")["src-tauri/Cargo.toml"], undefined)
})

test("Cargo lock must contain exactly one matching application package", () => {
  const entry = '[[package]]\nname = "u-frame"\nversion = "0.1.0"\n'
  assert.equal(cargoVersions("", entry)["src-tauri/Cargo.lock"], "0.1.0")
  assert.equal(cargoVersions("", entry + entry)["src-tauri/Cargo.lock"], undefined)
})

test("checked-in workflows satisfy the executable policy", () => {
  for (const name of ["ci.yml", "release.yml"]) assert.deepEqual(workflowErrors(name, workflow(name)), [])
})

test("workflow policy rejects privilege expansion, mutable actions and interpolated shell", () => {
  const mutations = [
    (w) => { w.on.pull_request_target = {} },
    (w) => { w.permissions.contents = "write" },
    (w) => { w.jobs["quality-gate"].permissions = "write-all" },
    (w) => { w.jobs["quality-gate"].permissions = { "id-token": "write" } },
    (w) => { w.jobs["quality-gate"].steps[0].uses = "actions/checkout@main" },
    (w) => { w.jobs["quality-gate"].steps[0].with["persist-credentials"] = true },
    (w) => { w.jobs["quality-gate"].steps.push({ run: "echo ${{ github.event.pull_request.title }}" }) },
    (w) => { w.jobs["quality-gate"].env = { KEY: "${{ secrets.KEY }}" } },
    (w) => { w.jobs["quality-gate"].env = { KEY: "${{ secrets['KEY'] }}" } },
    (w) => { w.jobs["quality-gate"]["continue-on-error"] = true },
    (w) => { w.jobs["quality-gate"].steps.find((s) => s.run === "pnpm gate").if = false },
    (w) => { w.on.push.branches = ["unprotected"] },
    (w) => { delete w.jobs["quality-gate"]["timeout-minutes"] },
  ]
  for (const mutate of mutations) {
    const value = workflow("ci.yml")
    mutate(value)
    assert.ok(workflowErrors("ci.yml", value).length, mutate.toString())
  }
})

test("release checks require isolated gate, complete native matrix and tag-only verified publishing", () => {
  const mutations = [
    (w) => { delete w.jobs["verify-source"] },
    (w) => { w.jobs.build.needs = [] },
    (w) => { w.jobs.build.strategy.matrix.include.pop() },
    (w) => { w.jobs.build.strategy.matrix.include[0].target = "x86_64-apple-darwin" },
    (w) => { w.jobs.build.permissions = { contents: "write" } },
    (w) => { w.jobs.build.env = { KEY: "${{ secrets.KEY }}" } },
    (w) => { w.jobs.publish.needs = ["verify-source"] },
    (w) => { delete w.jobs.publish.if },
    (w) => { w.jobs.publish.steps.find((s) => s.id === "publish")["continue-on-error"] = true },
    (w) => { w.jobs.publish.permissions["id-token"] = "write" },
    (w) => { w.jobs.build.steps.find((s) => s.uses?.startsWith("actions/upload-artifact")).with["if-no-files-found"] = "warn" },
    (w) => { w.jobs.build.steps.find((s) => s.run?.includes("release-artifacts.mjs collect")).if = false },
    (w) => { w.on.workflow_dispatch = {} },
  ]
  for (const mutate of mutations) {
    const value = workflow("release.yml")
    mutate(value)
    assert.ok(workflowErrors("release.yml", value).length, mutate.toString())
  }
})
