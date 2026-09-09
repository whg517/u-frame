import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { verify } from "./release-artifacts.mjs"
import { devPublishArgs, digest, publishArgs, verifyUploadedAssets } from "./lib/release-policy.mjs"

const root = resolve(import.meta.dirname, "..")
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version
const tag = process.env.GITHUB_REF_NAME
if (tag !== `v${version}` || !process.env.GH_TOKEN || process.argv.length !== 3) throw new Error("Matching tag, token and artifact directory required")
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
const directory = mkdtempSync(join(tmpdir(), "uframe-publish-"))
const assets = join(directory, "assets")
const records = verify(resolve(process.argv[2]), assets, version, commit)
const notes = join(directory, "notes.md")
writeFileSync(notes, `开发测试构建，不是正式稳定版。仅通过 GitHub Release 分发，不上架应用商店。

版本：${version}
源码：${commit}

- macOS arm64：DMG，仅 ad-hoc 签名，无 Developer ID / Apple 公证，可能出现 Gatekeeper 提示。
- Windows amd64：NSIS EXE，无 Authenticode 签名，可能出现 SmartScreen 提示；需要 WebView2。
- Linux amd64 / arm64：DEB，Ubuntu 24.04 构建，需要 WebKitGTK 4.1 等系统依赖，不宣称适用于所有发行版。

各平台已执行 Rust 测试和构建、架构检查，完整业务门禁在 macOS 执行；自动构建不等于四平台人工安装和交互验收。
dev 指发布通道，使用优化的 Release 构建，不包含 Debug 开发数据入口。
下载后请核对 SHA256SUMS；release-manifest.json 记录平台、版本、源码与摘要。
数据仅在本机保存；不提供数据备份、迁移或恢复功能。
`)
const files = [...records.map((record) => join(assets, record.name)), join(assets, "SHA256SUMS"), join(assets, "release-manifest.json")]
// Creation fails if the tag already has a release; never overwrite existing assets.
execFileSync("gh", publishArgs(tag, files, notes), { cwd: root, stdio: "inherit" })
const release = JSON.parse(execFileSync("gh", ["api", `repos/{owner}/{repo}/releases/tags/${tag}`], { cwd: root, encoding: "utf8" }))
if (!release.draft) throw new Error("Release must remain a draft until uploads are verified")
verifyUploadedAssets(release.assets, files.map((path) => ({ name: basename(path), ...digest(path) })))
const finalize = devPublishArgs(tag)
if (finalize) execFileSync("gh", finalize, { cwd: root, stdio: "inherit" })
