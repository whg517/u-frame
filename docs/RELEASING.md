# UFrame 发布规范

| 属性 | 内容 |
|---|---|
| 文档状态 | Active |
| 版本 | v1.1 |
| 更新日期 | 2026-09-09 |
| 适用范围 | GitHub Release 分发的 macOS Universal DMG |
| 关联文档 | [开发规范](DEVELOPMENT_GUIDE.md) · [GitHub 治理](GITHUB_GOVERNANCE.md) · [技术设计](TECHNICAL_DESIGN.md) · [变更记录](../CHANGELOG.md) |

## 1. 发布原则

- Sprint、合并和发布不是一一对应关系；`main` 可以持续集成，只有经过验收的版本才创建 Release。
- 正式发行使用 SemVer tag `vMAJOR.MINOR.PATCH`；预发行允许 `vMAJOR.MINOR.PATCH-rc.N`。
- 应用版本、Git tag、完整 Git SHA、DMG 文件和 SHA-256 摘要必须可相互追踪。
- 同一 tag 只对应一组最终候选制品；需要代码修正时提升版本并创建新 tag。未生成可用 Draft 的外部服务短暂故障允许原源码重试，不移动 tag 或覆盖已经发布的资产。
- 自动化只创建 Draft Release；维护者完成安装验收后人工发布。
- 对外 DMG 必须使用 Developer ID Application 签名并完成 Apple notarization，不提供静默降级的未签名正式包。

## 2. 固定构建基线

| 项目 | 基线 |
|---|---|
| 操作系统 | GitHub hosted `macos-15` |
| Node.js | `.node-version` 中的 24.20.0 |
| pnpm | `package.json#packageManager` 中的 11.10.0 |
| Rust | `rust-toolchain.toml` 中的 1.98.1 |
| Rust targets | `aarch64-apple-darwin`、`x86_64-apple-darwin` |
| 产物 | 一个 Universal `.app` 和一个 Universal `.dmg` |
| 包依赖 | `pnpm-lock.yaml`、`src-tauri/Cargo.lock` |

升级构建基线必须通过独立 PR，并同时更新工作流、文档和本地验证证据。

## 3. GitHub Release 环境

在 GitHub `release` environment 中配置以下 secrets：

| Secret | 用途 |
|---|---|
| `APPLE_CERTIFICATE` | Base64 编码的 Developer ID Application `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` 导出密码 |
| `APPLE_SIGNING_IDENTITY` | Developer ID Application identity |
| `APPLE_ID` | notarization 使用的 Apple ID |
| `APPLE_PASSWORD` | Apple app-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

只在 environment 中保存凭据，不写入仓库、Issue、PR、日志或普通 Actions variable。证书更新、成员离职、泄露怀疑或 Apple 凭据变化时立即轮换，并以一次不发布的候选验证新凭据。

## 4. 准备发布候选

1. 建立发布 Issue，冻结范围、已知限制和验收负责人。
2. 更新 `package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 为同一 SemVer；执行 `cargo check` 更新 `Cargo.lock` 中的包版本。
3. 把“未发布”内容整理为版本条目，记录日期、用户可见变化、数据库 schema migration 和兼容性。
4. 执行 `pnpm version:check` 和 `pnpm gate`，在真实 Tauri 窗口中完成发布范围验收。
5. 通过 Pull Request squash 合并到 `main`，等待 `quality-gate` 成功。
6. 在最新本地 `main` 创建 annotated tag，并仅推送该 tag：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
pnpm version:check
pnpm gate
git tag -a v0.1.0 -m "UFrame v0.1.0"
git push origin v0.1.0
```

如果项目启用签名 Git tag，则在上述流程中使用已配置的签名方式；不得为了赶发布关闭 tag 验证。

## 5. 自动构建流程

Tag push 触发 [Release workflow](../.github/workflows/release.yml)：

1. 在独立只读 verify-source job 确认四处应用版本（含 Cargo.lock）与 tag 一致，tag 是 annotated tag 且目标提交属于 origin/main。
2. 读取仓库工具链文件，安装锁定依赖，执行完整 pnpm gate；本 job 不使用发布 environment。
3. 成功后在新的签名 runner 重新检出并检查同一来源，安装工具链与依赖。
4. 只在 signed_build 步骤注入并检查六项 Apple secrets，再为 Intel 和 Apple Silicon 构建 Universal app/DMG，完成签名与 notarization。
5. 拒绝缺少或多份候选 app/DMG；读取 app 的 CFBundleExecutable，使用 lipo 检查 arm64 与 x86_64。
6. codesign 验证 app 与 DMG 签名；spctl 检查 app Gatekeeper；xcrun stapler 验证 app 与 DMG 的 ticket。全部成功后原子写入 SHA256SUMS。
7. publish 步骤仅接收 GitHub token，再次计算当前唯一 DMG 摘要并与验证文件精确比对，然后创建 Draft；预发行 tag 标记 prerelease。

任一步失败都不得人工上传同名“临时修复包”冒充流水线产物。修复代码或配置后创建新版本 tag；如果只是可重试的 GitHub/Apple 短暂故障，可以在不改变源码和 tag 的前提下重跑失败 job。

## 6. Draft Release 验收

维护者从 Draft Release 下载 DMG，而不是直接使用 CI 工作目录，并完成：

- `shasum -a 256` 与 `SHA256SUMS` 一致。
- DMG 可以挂载，应用可拖入 `/Applications`。
- Gatekeeper 不显示未签名或来源损坏警告。
- Intel 与 Apple Silicon 至少各完成一次安装启动；条件不足时不得宣称双架构已验收。
- 空库首次启动、数据库 schema migration、应用重启和已实现的核心业务闭环通过。
- 深色和浅色模式、最小窗口尺寸、关键画布交互无阻断问题。
- Release notes、版本号、已知限制、下载文件名和摘要正确。
- 当 Excel 导入导出或审计进入该版本范围后，必须增加相应真实文件和操作记录验收。

验收证据记录在发布 Issue。全部通过后由维护者发布 Draft Release；若仓库启用了 Immutable Releases，发布后不得替换 tag 或资产。

## 7. 本地候选构建

本地可用于提前发现 Universal 构建问题，但不能替代 GitHub 签名发行：

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm install --frozen-lockfile
pnpm gate
pnpm release:build
```

只有配置了正式 Apple 凭据且 `pnpm release:verify` 通过的本地产物，才具备与发布候选相同的签名属性；本地文件不得手工替换流水线 Draft Release 中的资产。

## 8. 故障与回滚

- Draft 未发布：保留失败证据，关闭错误 Draft；修复后使用新版本 tag 重建。
- 已发布但应用有缺陷：停止推广，创建修复版本；不可变 Release 不覆盖原资产。
- 数据库 migration 只允许向前演进。应用版本回滚不等于数据库回滚，必须先验证旧版本能否读取新 schema。
- 发现证书或凭据泄露：立即撤销/轮换，暂停 Release workflow，评估已发布制品并发布安全公告。
- GitHub 或 Apple 服务不可用：不绕过签名、公证和验证门禁，等待恢复后重跑。

## 9. 主要依据

- [Tauri GitHub Actions 发布指南](https://v2.tauri.app/distribute/pipelines/github/)
- [Tauri macOS 代码签名](https://v2.tauri.app/distribute/sign/macos/)
- [GitHub Actions 安全加固](https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats)
- [GitHub Immutable Releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub Actions 安全使用](https://docs.github.com/en/actions/reference/security/secure-use)
- [Apple Universal 二进制](https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary)

## 10. 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-09-07 | 建立 macOS Universal 签名公证与 Draft 安装验收流程。 |
| v1.1 | 2026-09-09 | 分离来源验证与签名，明确唯一制品、双架构、双签名和发布前摘要复核，澄清不可变 tag 重试边界。 |
